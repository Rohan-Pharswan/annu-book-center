import { getCustomerToStoreWhatsAppUrl } from "../lib/storeConfig.js";
import assert from "assert";

console.log("=== TESTING COMPLETE WHATSAPP MESSAGE GENERATION ===");

// 1. Multi-item order with discounts and pending delivery charge
const pendingOrder = {
  _id: "6a8b323e396abdd289488bcb",
  userId: {
    name: "Rohan Pharswan",
    email: "rohan@example.com",
    phone: "9876543210"
  },
  customerPhone: "9876543210",
  address: {
    line1: "Flat 402, Green Valley Apartments",
    city: "Dehradun",
    state: "Uttarakhand",
    postalCode: "248001"
  },
  items: [
    { name: "Lucent Hindi", quantity: 2, price: 210 },
    { name: "Class 10 Math", quantity: 1, price: 350 }
  ],
  subtotalAmount: 770,
  totalSavings: 50,
  totalAmount: 720,
  deliveryCharge: 0,
  deliveryChargeStatus: "pending"
};

const waPendingUrl = getCustomerToStoreWhatsAppUrl(pendingOrder);
console.log("\n[TEST 1] Pending Home Delivery Order URL:");
console.log(waPendingUrl);

const decodedPending = decodeURIComponent(waPendingUrl.split("text=")[1]);
console.log("\n[TEST 1] Decoded Message:\n" + decodedPending);

// Assertions for Test 1
assert(waPendingUrl.startsWith("https://wa.me/918077308953?text="), "Must point to store WhatsApp number");
assert(decodedPending.includes("Hello Annu Book Center,"), "Must contain greeting");
assert(decodedPending.includes("I have placed Home Delivery order #488bcb."), "Must contain order ID");
assert(decodedPending.includes("Customer Details:"), "Must contain customer details header");
assert(decodedPending.includes("Name: Rohan Pharswan"), "Must contain customer name");
assert(decodedPending.includes("Phone: 9876543210"), "Must contain customer phone");
assert(decodedPending.includes("Flat 402, Green Valley Apartments"), "Must contain address line 1");
assert(decodedPending.includes("Dehradun"), "Must contain city");
assert(decodedPending.includes("Uttarakhand - 248001"), "Must contain state - postalCode");
assert(decodedPending.includes("• 2 × Lucent Hindi — ₹210 each"), "Must contain item 1");
assert(decodedPending.includes("• 1 × Class 10 Math — ₹350 each"), "Must contain item 2");
assert(decodedPending.includes("Book Subtotal: ₹770"), "Must contain subtotal");
assert(decodedPending.includes("Discount: ₹50"), "Must contain discount");
assert(decodedPending.includes("Current Order Amount: ₹720"), "Must contain current total");
assert(decodedPending.includes("Delivery Charge: To be confirmed"), "Must state delivery charge to be confirmed");
assert(decodedPending.includes("Please confirm my home delivery charges."), "Must request confirmation");

console.log("✓ Test 1 Passed: Pending Home Delivery message is 100% complete and accurate!");

// 2. Confirmed order with confirmed delivery charge
const confirmedOrder = {
  ...pendingOrder,
  deliveryCharge: 80,
  deliveryChargeStatus: "confirmed",
  totalAmount: 800
};

const waConfirmedUrl = getCustomerToStoreWhatsAppUrl(confirmedOrder);
const decodedConfirmed = decodeURIComponent(waConfirmedUrl.split("text=")[1]);
console.log("\n[TEST 2] Confirmed Order Decoded Message:\n" + decodedConfirmed);

assert(decodedConfirmed.includes("Delivery Charge: ₹80 (Confirmed)"), "Must show confirmed delivery charge");
assert(decodedConfirmed.includes("Current Order Amount: ₹800"), "Must show updated total amount");

console.log("✓ Test 2 Passed: Confirmed Home Delivery message shows confirmed delivery fee and updated total!");

// 3. Fallback when user profile is passed as parameter
const orderWithoutPopulatedUser = {
  _id: "6a8b323e396abdd289488bcc",
  customerPhone: "9411395022",
  address: {
    line1: "Shop 12, Clock Tower",
    city: "Dehradun",
    state: "Uttarakhand",
    postalCode: "248001"
  },
  items: [{ name: "Physics Handbook", quantity: 3, price: 150 }],
  subtotalAmount: 450,
  totalSavings: 0,
  totalAmount: 450,
  deliveryChargeStatus: "pending"
};

const currentUser = { name: "Annu Customer", phone: "9411395022" };
const waFallbackUrl = getCustomerToStoreWhatsAppUrl(orderWithoutPopulatedUser, currentUser);
const decodedFallback = decodeURIComponent(waFallbackUrl.split("text=")[1]);
console.log("\n[TEST 3] Fallback User Message:\n" + decodedFallback);

assert(decodedFallback.includes("Name: Annu Customer"), "Must use fallback user name");
assert(decodedFallback.includes("Phone: 9411395022"), "Must use phone");
assert(decodedFallback.includes("• 3 × Physics Handbook — ₹150 each"), "Must list items");

console.log("✓ Test 3 Passed: Fallback to active logged-in user profile functions perfectly!");

console.log("\n>>> ALL WHATSAPP MESSAGE TESTS PASSED WITH 100% PRECISION! <<<");
