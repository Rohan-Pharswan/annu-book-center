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

console.log("=== COLLECTIONS ===");
const collections = await mongoose.connection.db.listCollections().toArray();
for (const col of collections) {
  const count = await mongoose.connection.collection(col.name).countDocuments();
  console.log(`Collection ${col.name}: ${count} docs`);
}

console.log("\n=== ALL ORDERS ===");
const orders = await mongoose.connection.collection("orders").find({}).toArray();
for (const order of orders) {
  console.log(JSON.stringify({
    id: order._id,
    orderId: order.orderId,
    customerName: order.shippingAddress?.fullName || order.customerName || order.user?.name,
    customerPhone: order.shippingAddress?.phone || order.customerPhone,
    customerEmail: order.shippingAddress?.email || order.customerEmail,
    items: order.items?.map(i => ({ title: i.title, qty: i.quantity, price: i.price })),
    total: order.totalAmount || order.total,
    status: order.orderStatus || order.status,
    createdAt: order.createdAt,
    notes: order.notes
  }, null, 2));
}

console.log("\n=== ALL REVIEWS ===");
const reviews = await mongoose.connection.collection("reviews").find({}).toArray();
console.dir(reviews, { depth: null });

console.log("\n=== ALL NOTIFICATIONS ===");
const notifications = await mongoose.connection.collection("notifications").find({}).toArray();
console.dir(notifications, { depth: null });

await mongoose.disconnect();
