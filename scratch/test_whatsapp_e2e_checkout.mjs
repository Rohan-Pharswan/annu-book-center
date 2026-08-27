import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import {
  getWhatsAppConfig,
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

async function runE2ETests() {
  console.log("=== TESTING END-TO-END CHECKOUT & WHATSAPP NOTIFICATION FLOW ===\n");
  await mongoose.connect(envVars.MONGODB_URI);

  const testUserId = new mongoose.Types.ObjectId();
  const testOrderId1 = new mongoose.Types.ObjectId();
  const testOrderId2 = new mongoose.Types.ObjectId();

  // Test 1: Doorstep Delivery Order & WhatsApp Payload
  console.log("--- 1. Testing Doorstep Order Creation & WhatsApp Payload ---");
  const doorstepOrder = await Order.create({
    _id: testOrderId1,
    userId: testUserId,
    customerName: "Rahul Sharma",
    customerPhone: "9876543210",
    customerEmail: "rahul@example.com",
    fulfillmentType: "doorstep",
    address: {
      label: "Home",
      line1: "12/4 Canal Road",
      city: "Dehradun",
      state: "Uttarakhand",
      postalCode: "248001",
      phone: "9876543210"
    },
    items: [
      { productId: new mongoose.Types.ObjectId(), name: "NCERT Mathematics Class 10", originalPrice: 300, price: 300, quantity: 2 },
      { productId: new mongoose.Types.ObjectId(), name: "Classmate Notebooks 6-Pack", originalPrice: 250, price: 250, quantity: 1 }
    ],
    subtotalAmount: 850,
    totalSavings: 0,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    totalAmount: 850,
    status: "Pending"
  });

  const configWithTemplate = {
    accessToken: "test_token",
    phoneNumberId: "1234567890",
    adminNumber: "918077308953",
    templateName: "new_admin_order_alert",
    templateLang: "en_US",
    baseUrl: "https://annubookcenter.com",
    isConfigured: true
  };

  const templatePayload = buildMetaWhatsAppPayload(doorstepOrder, configWithTemplate);
  assert.strictEqual(templatePayload.messaging_product, "whatsapp");
  assert.strictEqual(templatePayload.to, "918077308953");
  assert.strictEqual(templatePayload.type, "template");
  assert.strictEqual(templatePayload.template.name, "new_admin_order_alert");
  assert.strictEqual(templatePayload.template.components[0].parameters[0].text, String(testOrderId1).slice(-6).toUpperCase());
  console.log("  ✓ Meta Template payload verified successfully");

  // Test 2: Store Visit Order & Text Payload
  console.log("\n--- 2. Testing Store Visit Order & Text Payload ---");
  const storeVisitOrder = await Order.create({
    _id: testOrderId2,
    userId: testUserId,
    customerName: "Pooja Verma",
    customerPhone: "9898989898",
    fulfillmentType: "store_visit",
    storeVisit: {
      visitDate: "2026-09-01",
      visitTime: "4:00 PM",
      storeLocation: "Annu Book Center, Dehradun"
    },
    items: [
      { productId: new mongoose.Types.ObjectId(), name: "Art & Craft Stationery Kit", originalPrice: 450, price: 450, quantity: 1 }
    ],
    subtotalAmount: 450,
    totalSavings: 0,
    deliveryCharge: 0,
    deliveryChargeStatus: "not_required",
    totalAmount: 450,
    status: "Pending"
  });

  const textPayload = buildMetaWhatsAppPayload(storeVisitOrder, { ...configWithTemplate, templateName: "" });
  assert.strictEqual(textPayload.type, "text");
  assert(textPayload.text.body.includes("🏬 Store Pickup"));
  assert(textPayload.text.body.includes("Pooja Verma"));
  assert(textPayload.text.body.includes(String(testOrderId2)));
  console.log("  ✓ Text fallback payload for Store Visit verified successfully");

  // Test 3: Simulated API Call Error Isolation
  console.log("\n--- 3. Testing WhatsApp API Failure Error Isolation ---");
  // Set invalid credentials to test error recording without breaking
  process.env.WHATSAPP_ACCESS_TOKEN = "EAABinvalid_token_xyz";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "100000000000000";
  process.env.WHATSAPP_ADMIN_NUMBER = "918077308953";

  const failResult = await sendAdminWhatsAppOrderNotification(doorstepOrder);
  assert.strictEqual(failResult.success, false, "Should return failure flag when Meta rejects credentials");

  const failedOrderInDB = await Order.findById(testOrderId1);
  assert.strictEqual(failedOrderInDB.whatsappAdminNotificationStatus, "failed");
  assert(failedOrderInDB.whatsappAdminNotificationError.length > 0, "Error must be recorded in order document");
  console.log("  ✓ Meta API error captured and logged safely without breaking application flow");
  console.log("  ✓ Order status in DB:", failedOrderInDB.whatsappAdminNotificationStatus);
  console.log("  ✓ Error message recorded:", failedOrderInDB.whatsappAdminNotificationError);

  // Cleanup
  await Order.findByIdAndDelete(testOrderId1);
  await Order.findByIdAndDelete(testOrderId2);
  await mongoose.disconnect();

  console.log("\n>>> ALL E2E CHECKOUT & WHATSAPP NOTIFICATION TESTS PASSED! <<<");
}

runE2ETests().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
