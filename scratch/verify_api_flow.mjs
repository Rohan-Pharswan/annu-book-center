import mongoose from "mongoose";
import fs from "fs";
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

async function verifyBrowserFlow() {
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  const testUserId = new mongoose.Types.ObjectId();
  const testOrderId = new mongoose.Types.ObjectId();
  const addressId = new mongoose.Types.ObjectId();

  const user = {
    _id: testUserId,
    name: "Rohan Pharswan",
    email: "rohan.browser.test@example.com",
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
    role: "customer",
    phone: "9876543210",
    addresses: [
      {
        _id: addressId,
        label: "Home",
        line1: "Flat 402, Green Valley Apartments",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
        phone: "9876543210"
      }
    ]
  };
  await db.collection("users").insertOne(user);

  const order = {
    _id: testOrderId,
    userId: testUserId,
    customerName: "Rohan Pharswan",
    customerPhone: "9876543210",
    customerEmail: "rohan.browser.test@example.com",
    fulfillmentType: "doorstep",
    address: {
      label: "Home",
      line1: "Flat 402, Green Valley Apartments",
      city: "Dehradun",
      state: "Uttarakhand",
      postalCode: "248001",
      phone: "9876543210"
    },
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Lucent Objective Hindi",
        originalPrice: 260,
        price: 210,
        savingsPerUnit: 50,
        quantity: 2
      },
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Mathematics Class 10",
        originalPrice: 400,
        price: 350,
        savingsPerUnit: 50,
        quantity: 1
      }
    ],
    subtotalAmount: 920,
    totalSavings: 150,
    totalAmount: 770,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    status: "Pending",
    paymentMethod: "Cash on Delivery",
    createdAt: new Date()
  };
  await db.collection("orders").insertOne(order);

  const token = jwt.sign(
    { userId: String(testUserId), email: "rohan.browser.test@example.com", role: "customer", name: "Rohan Pharswan" },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  console.log("=== CALLING /api/orders WITH USER AUTH TOKEN ===");
  const res = await fetch("http://localhost:3000/api/orders", {
    headers: { Cookie: `token=${token}` }
  });
  const data = await res.json();
  console.log("API status:", res.status);
  console.log("Returned Orders Count:", data.orders?.length);

  const retrievedOrder = data.orders[0];
  console.log("Retrieved Order Structure:", {
    _id: retrievedOrder._id,
    customerName: retrievedOrder.customerName,
    customerPhone: retrievedOrder.customerPhone,
    address: retrievedOrder.address,
    items: retrievedOrder.items,
    subtotalAmount: retrievedOrder.subtotalAmount,
    totalSavings: retrievedOrder.totalSavings,
    totalAmount: retrievedOrder.totalAmount,
    deliveryChargeStatus: retrievedOrder.deliveryChargeStatus
  });

  const { getCustomerToStoreWhatsAppUrl } = await import("./lib/storeConfig.js");
  const liveUrl = getCustomerToStoreWhatsAppUrl(retrievedOrder, user);
  console.log("\n=== LIVE GENERATED WHATSAPP URL ===");
  console.log(liveUrl);

  console.log("\n=== DECODED MESSAGE RECEIVED BY WHATSAPP ===");
  const decodedMsg = decodeURIComponent(liveUrl.split("text=")[1]);
  console.log(decodedMsg);

  // Clean up
  await db.collection("orders").deleteOne({ _id: testOrderId });
  await db.collection("users").deleteOne({ _id: testUserId });
  await mongoose.disconnect();
}

verifyBrowserFlow().catch(console.error);
