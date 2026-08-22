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

import Product from "../models/Product.js";
import { validate, productSchema } from "../lib/validators.js";

console.log("=== Testing Product Creation with Device/Base64 Image & URL Image ===");

// 1. Validate sample product with base64 image data URI (uploaded from device)
const sampleDeviceProduct = {
  name: "NCERT Mathematics Class 10",
  category: "Books",
  price: 250,
  stock: 15,
  description: "Official NCERT Mathematics textbook for Class 10 students.",
  images: [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  ],
  type: "book"
};

const validation1 = validate(productSchema, sampleDeviceProduct);
console.log("Device Base64 Image Validation:", validation1.ok ? "PASSED" : "FAILED", validation1.errors || "");

// 2. Validate sample product with HTTP URL
const sampleUrlProduct = {
  name: "Apsara Platinum Pencils Pack",
  category: "Stationery",
  price: 60,
  stock: 50,
  description: "High quality dark writing pencils pack of 10 with eraser and sharpener.",
  images: ["https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500"],
  type: "stationery"
};

const validation2 = validate(productSchema, sampleUrlProduct);
console.log("URL Image Validation:", validation2.ok ? "PASSED" : "FAILED", validation2.errors || "");

// 3. Test creating a product in DB
try {
  const created = await Product.create(sampleDeviceProduct);
  console.log("Product creation in DB with device image: SUCCESS! ID:", created._id);
  // Clean up test product
  await Product.findByIdAndDelete(created._id);
  console.log("Cleanup test product: SUCCESS");
} catch (err) {
  console.error("Product creation FAILED:", err);
} finally {
  await mongoose.disconnect();
}
