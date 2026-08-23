import mongoose from "mongoose";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const lines = env.split("\n");
let uri = "";
for (const line of lines) {
  if (line.startsWith("MONGODB_URI=")) {
    uri = line.substring("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
  }
}

await mongoose.connect(uri);

import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

console.log("=== Testing Doorstep Delivery vs Store Visit Order Placements ===");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.log(`FAIL: ${label}`);
    failed++;
  }
}

try {
  const user = await User.findOne({});
  const product = await Product.findOne({});

  if (!user || !product) {
    console.log("Test requires at least 1 user and 1 product in DB.");
  } else {
    // 1. Create a Doorstep Delivery Order
    const doorstepOrder = await Order.create({
      userId: user._id,
      items: [
        {
          productId: product._id,
          name: product.name,
          image: product.images[0] || "",
          originalPrice: 300,
          price: 270,
          savingsPerUnit: 30,
          quantity: 1
        }
      ],
      fulfillmentType: "doorstep",
      subtotalAmount: 270,
      totalSavings: 30,
      deliveryCharge: 100,
      totalAmount: 370,
      address: {
        label: "Home",
        line1: "Rajpur Road",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
        phone: "9876543210"
      },
      customerEmail: user.email,
      customerPhone: "9876543210",
      status: "Pending",
      paymentMethod: "Cash on Delivery"
    });

    assert(doorstepOrder.fulfillmentType === "doorstep", "Doorstep order has fulfillmentType 'doorstep'");
    assert(doorstepOrder.deliveryCharge === 100, "Doorstep order delivery charge is 100");
    assert(doorstepOrder.totalAmount === 370, "Doorstep order total includes 100 delivery charge");
    assert(Boolean(doorstepOrder.address?.line1), "Doorstep order contains delivery address");

    // 2. Create a Store Visit & Buy in Store Order
    const storeVisitOrder = await Order.create({
      userId: user._id,
      items: [
        {
          productId: product._id,
          name: product.name,
          image: product.images[0] || "",
          originalPrice: 300,
          price: 270,
          savingsPerUnit: 30,
          quantity: 1
        }
      ],
      fulfillmentType: "store_visit",
      storeVisit: {
        visitDate: "2026-08-25",
        visitTime: "Morning (10:00 AM - 1:00 PM)",
        storeLocation: "Annu Book Center, Dehradun"
      },
      subtotalAmount: 270,
      totalSavings: 30,
      deliveryCharge: 0,
      totalAmount: 270,
      customerEmail: user.email,
      customerPhone: "9876543210",
      status: "Pending",
      paymentMethod: "Pay at Store"
    });

    assert(storeVisitOrder.fulfillmentType === "store_visit", "Store visit order has fulfillmentType 'store_visit'");
    assert(storeVisitOrder.deliveryCharge === 0, "Store visit order delivery charge is 0 (FREE)");
    assert(storeVisitOrder.totalAmount === 270, "Store visit total has no delivery charge added");
    assert(storeVisitOrder.storeVisit?.visitDate === "2026-08-25", "Store visit date is stored correctly");
    assert(storeVisitOrder.paymentMethod === "Pay at Store", "Payment method is 'Pay at Store'");

    // Clean up test orders
    await Order.findByIdAndDelete(doorstepOrder._id);
    await Order.findByIdAndDelete(storeVisitOrder._id);
    console.log("Cleaned up test orders.");
  }
} catch (err) {
  console.error("Test error:", err);
  failed++;
} finally {
  await mongoose.disconnect();
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
