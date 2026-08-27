import assert from "node:assert";
import mongoose from "mongoose";
import {
  getEmailConfig,
  getCustomerOrderUrl,
  generateOrderConfirmationEmailHtml,
  generateOrderConfirmationEmailText,
  createMailTransporter
} from "../lib/email.js";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 STARTING GMAIL SMTP CUSTOMER EMAIL UNIT TESTS");
  console.log("==================================================");

  // Test 1: Config loading defaults
  console.log("\n[Test 1] Testing getEmailConfig defaults...");
  const config = getEmailConfig();
  assert.strictEqual(config.gmailUser, "ordersannubookcenter@gmail.com");
  assert.strictEqual(config.replyTo, "ordersannubookcenter@gmail.com");
  assert.strictEqual(config.from, "Annu Book Center <ordersannubookcenter@gmail.com>");
  assert.ok(config.baseUrl.includes("http"));
  console.log("✅ getEmailConfig passed!");

  // Test 2: getCustomerOrderUrl
  console.log("\n[Test 2] Testing getCustomerOrderUrl format...");
  const dummyId = new mongoose.Types.ObjectId();
  const orderUrl = getCustomerOrderUrl(dummyId, "http://localhost:3000");
  assert.strictEqual(orderUrl, `http://localhost:3000/orders#order-${dummyId}`);
  console.log("✅ getCustomerOrderUrl passed:", orderUrl);

  // Test 3: HTML template generation for Home Delivery with Discount & Pending Delivery Fee
  console.log("\n[Test 3] Testing HTML Template (Home Delivery + Discount)...");
  const homeDeliveryOrder = {
    _id: dummyId,
    customerName: "Rohan Pharswan",
    customerEmail: "rohan@example.com",
    customerPhone: "9876543210",
    fulfillmentType: "doorstep",
    address: {
      label: "Home",
      line1: "123 Rajpur Road",
      city: "Dehradun",
      state: "Uttarakhand",
      postalCode: "248001",
      phone: "9876543210"
    },
    items: [
      {
        name: "NCERT Physics Class 12",
        quantity: 2,
        price: 350,
        originalPrice: 400,
        savingsPerUnit: 50
      },
      {
        name: "Classmate Notebook 6-Pack",
        quantity: 1,
        price: 250,
        originalPrice: 300,
        savingsPerUnit: 50
      }
    ],
    subtotalAmount: 1100,
    totalSavings: 150,
    deliveryCharge: 0,
    deliveryChargeStatus: "pending",
    totalAmount: 950,
    status: "Pending",
    paymentMethod: "Cash on Delivery",
    createdAt: new Date("2026-08-27T10:00:00Z")
  };

  const htmlOutput1 = generateOrderConfirmationEmailHtml(homeDeliveryOrder, "http://localhost:3000");
  assert.ok(htmlOutput1.includes("Annu Book Center"), "HTML must contain store title");
  assert.ok(htmlOutput1.includes("Rohan Pharswan"), "HTML must contain customer name");
  assert.ok(htmlOutput1.includes("NCERT Physics Class 12"), "HTML must contain item 1");
  assert.ok(htmlOutput1.includes("Classmate Notebook 6-Pack"), "HTML must contain item 2");
  assert.ok(htmlOutput1.includes("1,100") || htmlOutput1.includes("1100"), "HTML must contain subtotal");
  assert.ok(htmlOutput1.includes("150"), "HTML must contain total savings");
  assert.ok(htmlOutput1.includes("950"), "HTML must contain final total");
  assert.ok(htmlOutput1.includes("To be confirmed"), "HTML must note pending delivery fee");
  assert.ok(htmlOutput1.includes("123 Rajpur Road"), "HTML must contain delivery address");
  assert.ok(htmlOutput1.includes(`orders#order-${dummyId}`), "HTML must contain direct View My Order link");
  assert.ok(htmlOutput1.includes("ordersannubookcenter@gmail.com"), "HTML must contain contact email");
  console.log("✅ Home delivery HTML generation passed!");

  // Test 4: HTML template generation for Store Pickup
  console.log("\n[Test 4] Testing HTML Template (Store Pickup)...");
  const storePickupOrder = {
    _id: dummyId,
    customerName: "Priya Sharma",
    customerEmail: "priya@example.com",
    fulfillmentType: "store_visit",
    storeVisit: {
      visitDate: "2026-08-28",
      visitTime: "04:00 PM - 06:00 PM",
      storeLocation: "Annu Book Center, Dehradun"
    },
    items: [
      {
        name: "Lucent's General Knowledge",
        quantity: 1,
        price: 280,
        originalPrice: 320,
        savingsPerUnit: 40
      }
    ],
    subtotalAmount: 320,
    totalSavings: 40,
    deliveryCharge: 0,
    deliveryChargeStatus: "not_required",
    totalAmount: 280,
    status: "Pending",
    paymentMethod: "Pay at Store"
  };

  const htmlOutput2 = generateOrderConfirmationEmailHtml(storePickupOrder, "http://localhost:3000");
  assert.ok(htmlOutput2.includes("Store Pickup"), "HTML must indicate Store Pickup");
  assert.ok(htmlOutput2.includes("FREE (Store Pickup)"), "Delivery fee must be free for store pickup");
  assert.ok(htmlOutput2.includes("2026-08-28"), "HTML must contain visit date");
  assert.ok(htmlOutput2.includes("04:00 PM - 06:00 PM"), "HTML must contain visit time");
  assert.ok(htmlOutput2.includes("Pay at Store"), "HTML must indicate Pay at Store");
  console.log("✅ Store Pickup HTML generation passed!");

  // Test 5: Plain text fallback generation
  console.log("\n[Test 5] Testing Plain Text Fallback...");
  const textOutput = generateOrderConfirmationEmailText(homeDeliveryOrder, "http://localhost:3000");
  assert.ok(textOutput.includes("ANNU BOOK CENTER - ORDER CONFIRMATION"));
  assert.ok(textOutput.includes("Rohan Pharswan"));
  assert.ok(textOutput.includes(`orders#order-${dummyId}`));
  console.log("✅ Plain text generation passed!");

  // Test 6: Transporter factory
  console.log("\n[Test 6] Testing Transporter Factory creation...");
  const mockConfig = {
    gmailUser: "ordersannubookcenter@gmail.com",
    gmailPassword: "mock_password"
  };
  const transporter = createMailTransporter(mockConfig);
  assert.ok(transporter, "Transporter must be created");
  assert.strictEqual(typeof transporter.sendMail, "function");
  console.log("✅ Nodemailer transporter initialized successfully!");

  console.log("\n==================================================");
  console.log("🎉 ALL TEMPLATE & LOGIC UNIT TESTS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
