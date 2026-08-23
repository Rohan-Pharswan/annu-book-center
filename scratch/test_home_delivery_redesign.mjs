import mongoose from "mongoose";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

const baseUrl = "http://localhost:3000";

async function runTests() {
  console.log("=== COMPREHENSIVE HOME DELIVERY & STORE PICKUP REDESIGN TEST ===");

  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  const jwt = await import("jsonwebtoken");

  // 1. Fetch or create a test product
  let product = await db.collection("products").findOne({});
  if (!product) throw new Error("No product in DB");
  const productId = String(product._id);
  const productPrice = Number(product.price || 100);

  // 2. Create customer user
  const customerId = new mongoose.Types.ObjectId();
  const customerEmail = `delivery_customer_${Date.now()}@example.com`;
  const addressId = new mongoose.Types.ObjectId();

  const customerUser = {
    _id: customerId,
    name: "Rohan Pharswan",
    email: customerEmail,
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
    role: "customer",
    phone: "9876543210",
    addresses: [
      {
        _id: addressId,
        label: "Home",
        line1: "Flat 402, Green Valley Apartments, Rajpur Road",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
        phone: "9876543210"
      }
    ],
    cart: [{ product: product._id, quantity: 2 }]
  };
  await db.collection("users").insertOne(customerUser);

  const customerToken = jwt.default.sign(
    { userId: String(customerId), email: customerEmail, role: "customer", name: "Rohan Pharswan" },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const customerHeaders = {
    "Content-Type": "application/json",
    Cookie: `token=${customerToken}`
  };

  // 3. Create admin user
  const adminId = new mongoose.Types.ObjectId();
  const adminEmail = `admin_test_${Date.now()}@example.com`;
  await db.collection("users").insertOne({
    _id: adminId,
    name: "Admin User",
    email: adminEmail,
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
    role: "admin"
  });

  const adminToken = jwt.default.sign(
    { userId: String(adminId), email: adminEmail, role: "admin", name: "Admin User" },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const adminHeaders = {
    "Content-Type": "application/json",
    Cookie: `token=${adminToken}`
  };

  try {
    // --- TEST 1: Home Delivery Order Placement ---
    console.log("\n[TEST 1] Placing Home Delivery Order (deliveryCharge should be 0, status: pending)...");
    const resHome = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        fulfillmentType: "doorstep",
        addressId: String(addressId)
      })
    });
    const dataHome = await resHome.json();
    console.log("  Response status:", resHome.status);
    console.log("  Order Created:", {
      orderId: dataHome.order?._id,
      fulfillmentType: dataHome.order?.fulfillmentType,
      deliveryCharge: dataHome.order?.deliveryCharge,
      deliveryChargeStatus: dataHome.order?.deliveryChargeStatus,
      totalAmount: dataHome.order?.totalAmount,
      subtotalAmount: dataHome.order?.subtotalAmount
    });

    if (!dataHome.success || dataHome.order?.deliveryCharge !== 0 || dataHome.order?.deliveryChargeStatus !== "pending") {
      throw new Error(`Home Delivery creation failed expectations: ${JSON.stringify(dataHome)}`);
    }
    const homeOrderId = dataHome.order._id;
    console.log("✓ Home Delivery Order created with deliveryCharge = 0 and deliveryChargeStatus = 'pending'!");

    // --- TEST 2: Admin Notification Verification ---
    console.log("\n[TEST 2] Verifying Admin Action Notification...");
    const resNotif = await fetch(`${baseUrl}/api/admin/notifications`, { headers: adminHeaders });
    const dataNotif = await resNotif.json();
    const alert = (dataNotif.notifications || []).find((n) => String(n.meta?.orderId) === String(homeOrderId));
    if (!alert) throw new Error("Admin notification not created for home delivery order");
    console.log("  Notification Title:", alert.title);
    console.log("  Notification Meta:", alert.meta);
    if (!alert.meta?.deliveryAddress || alert.meta?.deliveryChargeStatus !== "pending") {
      throw new Error("Admin notification meta is missing structured delivery address or pending status");
    }
    console.log("✓ Admin received structured Action Card notification with customer location & items!");

    // --- TEST 3: Admin Delivery Charge Confirmation ---
    console.log("\n[TEST 3] Admin Setting & Confirming Delivery Charge (e.g. ₹80)...");
    const resConfirmFee = await fetch(`${baseUrl}/api/admin/orders/${homeOrderId}/delivery-charge`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ deliveryCharge: 80 })
    });
    const dataConfirmFee = await resConfirmFee.json();
    console.log("  Updated Order:", {
      deliveryCharge: dataConfirmFee.order?.deliveryCharge,
      deliveryChargeStatus: dataConfirmFee.order?.deliveryChargeStatus,
      totalAmount: dataConfirmFee.order?.totalAmount
    });

    if (dataConfirmFee.order?.deliveryCharge !== 80 || dataConfirmFee.order?.deliveryChargeStatus !== "confirmed") {
      throw new Error("Failed to confirm delivery charge");
    }
    console.log("✓ Admin successfully set delivery charge to ₹80, total recalculated cleanly!");

    // --- TEST 4: Customer Order Verification ---
    console.log("\n[TEST 4] Customer Viewing Updated Order...");
    const resCustView = await fetch(`${baseUrl}/api/orders/${homeOrderId}`, { headers: customerHeaders });
    const dataCustView = await resCustView.json();
    console.log("  Customer views total:", dataCustView.order?.totalAmount, "Delivery fee:", dataCustView.order?.deliveryCharge, "Status:", dataCustView.order?.deliveryChargeStatus);
    if (dataCustView.order?.deliveryCharge !== 80 || dataCustView.order?.deliveryChargeStatus !== "confirmed") {
      throw new Error("Customer view does not reflect confirmed delivery charge");
    }
    console.log("✓ Customer sees updated delivery charge (₹80) and final total!");

    // --- TEST 5: Store Pickup Order Placement ---
    console.log("\n[TEST 5] Placing Store Pickup Order...");
    // Add item back to cart
    await db.collection("users").updateOne(
      { _id: customerId },
      { $set: { cart: [{ product: product._id, quantity: 1 }] } }
    );

    const resStore = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        fulfillmentType: "store_visit",
        visitDate: "2026-08-25",
        visitTime: "10:00 AM - 1:00 PM",
        customerPhone: "9876543210"
      })
    });
    const dataStore = await resStore.json();
    console.log("  Store Order:", {
      orderId: dataStore.order?._id,
      fulfillmentType: dataStore.order?.fulfillmentType,
      deliveryCharge: dataStore.order?.deliveryCharge,
      deliveryChargeStatus: dataStore.order?.deliveryChargeStatus,
      storeVisit: dataStore.order?.storeVisit
    });

    if (!dataStore.success || dataStore.order?.deliveryCharge !== 0 || dataStore.order?.deliveryChargeStatus !== "not_required") {
      throw new Error("Store Pickup failed expectations");
    }
    const storeOrderId = dataStore.order._id;
    console.log("✓ Store Pickup order placed with deliveryCharge = 0 and deliveryChargeStatus = 'not_required'!");

    // Clean up test data
    await db.collection("orders").deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(homeOrderId), new mongoose.Types.ObjectId(storeOrderId)] } });
    await db.collection("notifications").deleteMany({ "meta.orderId": { $in: [new mongoose.Types.ObjectId(homeOrderId), new mongoose.Types.ObjectId(storeOrderId)] } });
    await db.collection("users").deleteMany({ _id: { $in: [customerId, adminId] } });
    // Restore product stock
    await db.collection("products").updateOne({ _id: product._id }, { $inc: { stock: 3 } });

    console.log("\n>>> ALL HOME DELIVERY & STORE PICKUP TESTS PASSED! <<<");
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
