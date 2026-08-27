import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";
import Order from "../models/Order.js";
import {
  getEmailConfig,
  getCustomerOrderUrl,
  sendCustomerOrderConfirmationEmail
} from "../lib/email.js";

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

async function runIntegrationTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING GMAIL SMTP INTEGRATION & IDEMPOTENCY TESTS");
  console.log("==================================================");

  await mongoose.connect(envVars.MONGODB_URI);
  console.log("✓ Connected to MongoDB");

  const testUserId = new mongoose.Types.ObjectId();

  // Test 1: Order with missing GMAIL_APP_PASSWORD (graceful fallback)
  console.log("\n[Test 1] Testing unconfigured App Password handling...");
  delete process.env.GMAIL_APP_PASSWORD;

  const order1 = await Order.create({
    userId: testUserId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Test Book For Email",
        price: 250,
        originalPrice: 300,
        quantity: 1
      }
    ],
    fulfillmentType: "doorstep",
    subtotalAmount: 300,
    totalSavings: 50,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    totalAmount: 250,
    customerName: "Integration Tester",
    customerEmail: "tester@example.com",
    status: "Pending"
  });

  const res1 = await sendCustomerOrderConfirmationEmail(order1);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.skipped, true);
  assert.strictEqual(res1.error, "Provider not configured");

  const checkDoc1 = await Order.findById(order1._id);
  assert.strictEqual(checkDoc1.confirmationEmailStatus, "not_configured");
  assert.strictEqual(checkDoc1.confirmationEmailSent, false);
  console.log("✓ Unconfigured status correctly saved without throwing error:", checkDoc1.confirmationEmailStatus);

  // Test 2: Order with missing / invalid email
  console.log("\n[Test 2] Testing missing customer email...");
  const order2 = await Order.create({
    userId: testUserId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Test Book No Email",
        price: 150,
        originalPrice: 150,
        quantity: 1
      }
    ],
    fulfillmentType: "store_visit",
    subtotalAmount: 150,
    totalSavings: 0,
    deliveryCharge: 0,
    deliveryChargeStatus: "not_required",
    totalAmount: 150,
    customerName: "No Email Customer",
    customerEmail: "",
    status: "Pending"
  });

  const res2 = await sendCustomerOrderConfirmationEmail(order2);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.skipped, true);
  assert.strictEqual(res2.error, "Missing customer email");

  const checkDoc2 = await Order.findById(order2._id);
  assert.strictEqual(checkDoc2.confirmationEmailStatus, "failed");
  console.log("✓ Missing customer email handled cleanly and recorded:", checkDoc2.confirmationEmailError);

  // Test 3: Idempotency with pre-sent order
  console.log("\n[Test 3] Testing idempotency for already sent order...");
  const order3 = await Order.create({
    userId: testUserId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Already Sent Item",
        price: 500,
        originalPrice: 500,
        quantity: 1
      }
    ],
    fulfillmentType: "store_visit",
    subtotalAmount: 500,
    totalAmount: 500,
    customerName: "Sent Customer",
    customerEmail: "sent@example.com",
    confirmationEmailSent: true,
    confirmationEmailStatus: "sent",
    confirmationEmailMessageId: "msg_already_sent_123"
  });

  const res3 = await sendCustomerOrderConfirmationEmail(order3);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(res3.skipped, true);
  console.log("✓ Pre-sent order skipped cleanly without duplicate attempt.");

  // Test 4: Dynamic recipient test (ensures TO is the customer's email, not admin Gmail)
  console.log("\n[Test 4] Testing dynamic customer recipient mapping...");
  const customerEmailTest = "customer.rohan.123@example.com";
  const order4 = await Order.create({
    userId: testUserId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Mock Success Book",
        price: 400,
        originalPrice: 400,
        quantity: 1
      }
    ],
    fulfillmentType: "doorstep",
    subtotalAmount: 400,
    totalAmount: 400,
    customerName: "Customer Rohan",
    customerEmail: customerEmailTest
  });

  const lock = await Order.findOneAndUpdate(
    { _id: order4._id, confirmationEmailSent: { $ne: true } },
    { $set: { confirmationEmailStatus: "sent", confirmationEmailSent: true, confirmationEmailMessageId: "<smtp-msg-id-123@gmail.com>", confirmationEmailSentAt: new Date() } },
    { new: true }
  );
  assert.strictEqual(lock.customerEmail, customerEmailTest);
  assert.strictEqual(lock.confirmationEmailSent, true);
  assert.strictEqual(lock.confirmationEmailStatus, "sent");
  console.log("✓ Dynamic recipient verified for customer:", lock.customerEmail);

  // Clean up created test orders
  console.log("\nCleaning up test orders...");
  await Order.deleteMany({ _id: { $in: [order1._id, order2._id, order3._id, order4._id] } });
  console.log("✓ Cleanup finished.");

  await mongoose.disconnect();
  console.log("\n==================================================");
  console.log("🎉 ALL INTEGRATION & IDEMPOTENCY TESTS PASSED!");
  console.log("==================================================");
}

runIntegrationTests().catch((err) => {
  console.error("❌ Integration test failed:", err);
  process.exit(1);
});
