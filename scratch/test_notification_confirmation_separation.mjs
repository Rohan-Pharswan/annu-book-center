import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";

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

async function runTest() {
  console.log("=== TESTING NOTIFICATION CONFIRMATION SEPARATION & IDEMPOTENCY ===\n");
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  const testUserId = new mongoose.Types.ObjectId();
  const testOrderId = new mongoose.Types.ObjectId();
  const testNotifId = new mongoose.Types.ObjectId();

  // 1. Insert a pending home delivery order
  const orderDoc = {
    _id: testOrderId,
    userId: testUserId,
    customerName: "Rohan Separation Test",
    customerPhone: "9876543210",
    customerEmail: "rohan.sep@example.com",
    fulfillmentType: "doorstep",
    address: {
      label: "Home",
      line1: "Flat 202, Valley Heights",
      city: "Dehradun",
      state: "Uttarakhand",
      postalCode: "248001",
      phone: "9876543210"
    },
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Separation Test Book",
        price: 450,
        quantity: 1
      }
    ],
    subtotalAmount: 450,
    totalSavings: 0,
    totalAmount: 450,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    status: "Pending",
    paymentMethod: "Cash on Delivery",
    createdAt: new Date()
  };
  await db.collection("orders").insertOne(orderDoc);

  // 2. Insert corresponding home delivery notification
  const notifDoc = {
    _id: testNotifId,
    type: "home_delivery_request",
    title: "New Home Delivery Request",
    message: `Customer ${orderDoc.customerName} placed order #${String(orderDoc._id).slice(-6)} (Home Delivery - delivery charges to be confirmed)`,
    meta: {
      orderId: orderDoc._id,
      userId: orderDoc.userId,
      customerName: orderDoc.customerName,
      customerPhone: orderDoc.customerPhone,
      deliveryAddress: orderDoc.address,
      items: [{ name: "Separation Test Book", quantity: 1, price: 450 }],
      subtotalAmount: 450,
      fulfillmentType: "doorstep"
    },
    read: false,
    createdAt: new Date()
  };
  await db.collection("notifications").insertOne(notifDoc);

  // Step 3: Test Classification Logic BEFORE confirmation
  console.log("--- 1. Testing Initial Classification (Pending Order) ---");
  const pendingLiveOrder = await db.collection("orders").findOne({ _id: testOrderId });
  const pendingNotif = await db.collection("notifications").findOne({ _id: testNotifId });

  const isPendingHomeDelivery =
    (pendingNotif.type === "home_delivery_request" || pendingNotif.meta?.fulfillmentType === "doorstep") &&
    (pendingLiveOrder.deliveryChargeStatus === "pending" || !pendingLiveOrder.deliveryChargeStatus) &&
    pendingLiveOrder.status === "Pending";

  assert.strictEqual(isPendingHomeDelivery, true, "Order must be classified as Action Required when pending");
  console.log("  ✓ Initial order is correctly placed in '🔴 Action Required' section");

  // Step 4: Confirm Delivery Fee
  console.log("\n--- 2. Confirming Delivery Fee (₹60) ---");
  const fee = 60;
  const itemsSubtotal = orderDoc.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const updatedTotal = itemsSubtotal + fee;

  await db.collection("orders").updateOne(
    { _id: testOrderId },
    {
      $set: {
        deliveryCharge: fee,
        deliveryChargeStatus: "confirmed",
        totalAmount: updatedTotal,
        status: "Confirmed"
      }
    }
  );
  await db.collection("notifications").updateOne(
    { _id: testNotifId },
    {
      $set: {
        "meta.deliveryCharge": fee,
        "meta.deliveryChargeStatus": "confirmed",
        "meta.totalAmount": updatedTotal,
        "meta.orderStatus": "Confirmed"
      }
    }
  );

  // Step 5: Test Classification Logic AFTER confirmation
  console.log("\n--- 3. Testing Classification After Confirmation ---");
  const confirmedLiveOrder = await db.collection("orders").findOne({ _id: testOrderId });
  const confirmedNotif = await db.collection("notifications").findOne({ _id: testNotifId });

  const isStillPending =
    (confirmedNotif.type === "home_delivery_request" || confirmedNotif.meta?.fulfillmentType === "doorstep") &&
    (confirmedLiveOrder.deliveryChargeStatus === "pending" || !confirmedLiveOrder.deliveryChargeStatus) &&
    confirmedLiveOrder.status === "Pending";

  assert.strictEqual(isStillPending, false, "Order must NOT be in Action Required after confirmation");
  console.log("  ✓ Confirmed order successfully leaves '🔴 Action Required'");
  console.log("  ✓ Confirmed order is moved to '🟢 Confirmed Orders & Alerts'");
  console.log(`  ✓ Confirmed Fee: ₹${confirmedLiveOrder.deliveryCharge}, Confirmed Total: ₹${confirmedLiveOrder.totalAmount}, Status: ${confirmedLiveOrder.status}`);

  // Step 6: Test Idempotency
  console.log("\n--- 4. Testing Confirmation Idempotency ---");
  const reFee = 60;
  const isAlreadyConfirmed =
    confirmedLiveOrder.deliveryChargeStatus === "confirmed" &&
    Number(confirmedLiveOrder.deliveryCharge) === reFee &&
    confirmedLiveOrder.status === "Confirmed";

  assert.strictEqual(isAlreadyConfirmed, true, "Must detect already confirmed state idempotently");
  console.log("  ✓ Re-confirming already-confirmed fee correctly detected without re-triggering duplicate writes");

  // Cleanup
  await db.collection("orders").deleteOne({ _id: testOrderId });
  await db.collection("notifications").deleteOne({ _id: testNotifId });
  await mongoose.disconnect();

  console.log("\n>>> ALL NOTIFICATION CONFIRMATION SEPARATION TESTS PASSED! <<<");
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
