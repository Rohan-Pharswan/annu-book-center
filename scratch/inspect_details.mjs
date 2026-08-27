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

console.log("=== ALL ORDERS ===");
const orders = await mongoose.connection.collection("orders").find({}).toArray();
console.dir(orders, { depth: null });

console.log("\n=== ALL REVIEWS ===");
const reviews = await mongoose.connection.collection("reviews").find({}).toArray();
console.dir(reviews, { depth: null });

console.log("\n=== ALL PRODUCTS ===");
const products = await mongoose.connection.collection("products").find({}).toArray();
console.log(`Total products: ${products.length}`);
products.forEach(p => {
  if (p.title.toLowerCase().includes("test")) {
    console.log("Test product found:", p._id, p.title);
  }
});

console.log("\n=== ALL NOTIFICATIONS ===");
const notifications = await mongoose.connection.collection("notifications").find({}).toArray();
console.log(`Total notifications: ${notifications.length}`);

await mongoose.disconnect();
