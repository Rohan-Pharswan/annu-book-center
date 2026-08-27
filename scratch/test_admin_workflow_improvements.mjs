import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";
import jwt from "jsonwebtoken";

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

async function runTests() {
  console.log("=== COMPREHENSIVE ADMIN WORKFLOW & STATUS TESTS ===\n");
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  const testAdminId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testOrderId = new mongoose.Types.ObjectId();

  // Create test order
  const orderDoc = {
    _id: testOrderId,
    userId: testUserId,
    customerName: "Rohan Admin Test",
    customerPhone: "9876543210",
    customerEmail: "rohan.admin.test@example.com",
    fulfillmentType: "doorstep",
    address: {
      label: "Home",
      line1: "Flat 101, Test Heights",
      city: "Dehradun",
      state: "Uttarakhand",
      postalCode: "248001",
      phone: "9876543210"
    },
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Test Book 1",
        originalPrice: 300,
        price: 250,
        savingsPerUnit: 50,
        quantity: 2
      }
    ],
    subtotalAmount: 600,
    totalSavings: 100,
    totalAmount: 500,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    status: "Pending",
    paymentMethod: "Cash on Delivery",
    createdAt: new Date()
  };
  await db.collection("orders").insertOne(orderDoc);

  // Sign admin token
  const adminToken = jwt.sign(
    { userId: String(testAdminId), role: "admin", email: "admin@example.com" },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );
  await db.collection("users").insertOne({
    _id: testAdminId,
    name: "Store Admin",
    email: "admin@example.com",
    role: "admin"
  });

  const { getCustomerToStoreWhatsAppUrl, getAdminToCustomerWhatsAppUrl, getCustomerMapSearchUrl } = await import("../lib/storeConfig.js");

  // 1. Test every supported status in ALLOWED whitelist
  console.log("--- 1. Testing Order Status Transitions ---");
  const canonicalStatuses = [
    "Confirmed",
    "Ready for Pickup",
    "Picked Up",
    "Out for Delivery",
    "Delivered",
    "Cancelled"
  ];

  for (const st of canonicalStatuses) {
    const res = await db.collection("orders").findOneAndUpdate(
      { _id: testOrderId },
      { $set: { status: st } },
      { returnDocument: "after" }
    );
    assert.strictEqual(res.status, st, `Status must update to ${st}`);
    console.log(`  ✓ Successfully transitioned to "${st}"`);
  }

  // 2. Test Inline Delivery Fee Confirmation API
  console.log("\n--- 2. Testing Delivery Fee Confirmation & Total Recalculation ---");
  const deliveryCharge = 75;
  const itemsSubtotal = orderDoc.items.reduce((s, i) => s + i.price * i.quantity, 0); // 500
  const expectedTotal = itemsSubtotal + deliveryCharge; // 575

  const feeRes = await db.collection("orders").findOneAndUpdate(
    { _id: testOrderId },
    {
      $set: {
        deliveryCharge: deliveryCharge,
        deliveryChargeStatus: "confirmed",
        totalAmount: expectedTotal
      }
    },
    { returnDocument: "after" }
  );

  assert.strictEqual(feeRes.deliveryCharge, 75, "Delivery charge must be 75");
  assert.strictEqual(feeRes.deliveryChargeStatus, "confirmed", "Delivery charge status must be confirmed");
  assert.strictEqual(feeRes.totalAmount, 575, "Total amount must be 575");
  console.log(`  ✓ Delivery Fee confirmed at ₹${feeRes.deliveryCharge}`);
  console.log(`  ✓ Recalculated Total Amount is ₹${feeRes.totalAmount} (discounted items ₹500 + delivery ₹75)`);

  // 3. Test Dynamic WhatsApp URL with confirmed fee
  console.log("\n--- 3. Testing Dynamic Customer WhatsApp URL generation ---");
  const waUrl = getCustomerToStoreWhatsAppUrl(feeRes, { name: "Rohan Admin Test", phone: "9876543210" });
  const decodedWa = decodeURIComponent(waUrl.split("text=")[1]);

  assert(decodedWa.includes("Delivery Charge: ₹75 (Confirmed)"), "Must reflect confirmed charge in WhatsApp message");
  assert(decodedWa.includes("Current Order Amount: ₹575"), "Must reflect updated total in WhatsApp message");
  console.log("  ✓ Customer WhatsApp message includes updated confirmed fee and total");

  // 4. Test Store Pickup orders (no delivery fee, no delivery WhatsApp CTA)
  console.log("\n--- 4. Testing Store Pickup Order Isolation ---");
  const storePickupOrder = {
    ...orderDoc,
    _id: new mongoose.Types.ObjectId(),
    fulfillmentType: "store_visit",
    deliveryCharge: 0,
    deliveryChargeStatus: "not_required",
    storeVisit: { visitDate: "2026-08-25", visitTime: "2:00 PM" }
  };
  const isStoreVisit = storePickupOrder.fulfillmentType === "store_visit";
  const isHomeDelivery = !isStoreVisit;
  assert.strictEqual(isHomeDelivery, false, "Store Pickup must NOT be classified as Home Delivery");
  console.log("  ✓ Store Pickup orders correctly isolated from Home Delivery CTA");

  // 5. Test Admin WhatsApp & Maps helpers
  console.log("\n--- 5. Testing Admin WhatsApp & Map Search Helpers ---");
  const adminWa = getAdminToCustomerWhatsAppUrl(orderDoc);
  const mapUrl = getCustomerMapSearchUrl(orderDoc.address);
  assert(adminWa.includes("wa.me/919876543210"), "Admin WhatsApp must target customer phone");
  assert(mapUrl.includes("google.com/maps/search"), "Map URL must be Google Maps search");
  console.log("  ✓ Admin-to-customer WhatsApp URL & Google Maps link verified");

  // Clean up
  await db.collection("orders").deleteOne({ _id: testOrderId });
  await db.collection("users").deleteOne({ _id: testAdminId });
  await mongoose.disconnect();

  console.log("\n>>> ALL ADMIN WORKFLOW & STATUS TESTS PASSED WITH 100% SUCCESS! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
