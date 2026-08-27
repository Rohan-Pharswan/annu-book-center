import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";
import Order from "../models/Order.js";
import {
  getWhatsAppConfig,
  getAdminOrderDirectUrl,
  buildAdminOrderTextMessage,
  buildMetaWhatsAppPayload,
  sendAdminWhatsAppOrderNotification
} from "../lib/whatsapp.js";

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
  console.log("=== TESTING WHATSAPP ADMIN NOTIFICATION SUITE ===\n");
  await mongoose.connect(envVars.MONGODB_URI);

  const testUserId = new mongoose.Types.ObjectId();
  const testOrderId = new mongoose.Types.ObjectId();

  // Test 1: Direct Order URL generation
  console.log("--- 1. Testing Exact Admin Direct Order URL ---");
  const testUrl = getAdminOrderDirectUrl(testOrderId, "https://annubookcenter.com");
  assert.strictEqual(
    testUrl,
    `https://annubookcenter.com/admin/orders?orderId=${testOrderId}#order-${testOrderId}`,
    "Direct order URL must target /admin/orders with query parameter and hash"
  );
  console.log("  ✓ Direct Order URL format is verified:", testUrl);

  // Test 2: Text Message Builder
  console.log("\n--- 2. Testing WhatsApp Notification Message Construction ---");
  const mockOrder = {
    _id: testOrderId,
    customerName: "Rohan Test",
    customerPhone: "8077308953",
    fulfillmentType: "doorstep",
    subtotalAmount: 500,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    totalAmount: 500,
    items: [
      { name: "CBSE Physics Class 12", quantity: 1, price: 500 }
    ]
  };
  const textMsg = buildAdminOrderTextMessage(mockOrder, "https://annubookcenter.com");
  assert(textMsg.includes("NEW ORDER"), "Message should contain NEW ORDER headline");
  assert(textMsg.includes("Rohan Test"), "Message should contain customer name");
  assert(textMsg.includes("8077308953"), "Message should contain customer phone");
  assert(textMsg.includes("CBSE Physics Class 12"), "Message should contain items");
  assert(textMsg.includes("Action Required"), "Home delivery with pending fee should display Action Required");
  assert(textMsg.includes(testUrl), "Message should include the exact direct order link");
  console.log("  ✓ Text message payload generated successfully:\n\n" + textMsg + "\n");

  // Test 3: Unconfigured Graceful Handling (No Crash, Order Safe)
  console.log("--- 3. Testing Missing Credentials Behavior ---");
  const orderDoc = await Order.create({
    _id: testOrderId,
    userId: testUserId,
    customerName: "Rohan Test",
    customerPhone: "8077308953",
    fulfillmentType: "doorstep",
    subtotalAmount: 500,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    totalAmount: 500,
    items: [
      { productId: new mongoose.Types.ObjectId(), name: "CBSE Physics Class 12", originalPrice: 500, price: 500, quantity: 1 }
    ]
  });

  const unconfiguredResult = await sendAdminWhatsAppOrderNotification(orderDoc);
  assert.strictEqual(unconfiguredResult.skipped, true, "Should gracefully skip when credentials not present");

  const updatedDoc = await Order.findById(testOrderId);
  assert.strictEqual(updatedDoc.whatsappAdminNotificationStatus, "not_configured");
  console.log("  ✓ Unconfigured credentials safely recorded status as 'not_configured' without throwing");

  // Test 4: Idempotency & Duplicate Prevention
  console.log("\n--- 4. Testing Idempotency & Duplicate Prevention ---");
  // Mark order as already sent
  await Order.findByIdAndUpdate(testOrderId, {
    whatsappAdminNotificationSent: true,
    whatsappAdminNotificationSentAt: new Date(),
    whatsappAdminNotificationMessageId: "wamid.HBgLMTE=",
    whatsappAdminNotificationStatus: "sent"
  });

  // Re-trigger dispatch
  const secondAttempt = await sendAdminWhatsAppOrderNotification(testOrderId);
  assert.strictEqual(secondAttempt.success, true);
  assert.strictEqual(secondAttempt.skipped, true, "Second attempt must be skipped idempotently");
  console.log("  ✓ Re-submitting or duplicate order checkout attempt was skipped without duplicate dispatch");

  // Cleanup
  await Order.findByIdAndDelete(testOrderId);
  await mongoose.disconnect();

  console.log("\n>>> ALL WHATSAPP ADMIN NOTIFICATION TESTS PASSED! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
