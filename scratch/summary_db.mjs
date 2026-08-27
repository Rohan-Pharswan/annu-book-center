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

console.log("=== USERS ===");
const users = await mongoose.connection.collection("users").find({}).toArray();
users.forEach(u => console.log(`User ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: "${u.role}"`));

console.log("\n=== ORDERS ===");
const orders = await mongoose.connection.collection("orders").find({}).toArray();
orders.forEach(o => console.log(`Order ID: ${o._id} | Num: ${o.orderNumber || o.orderId} | User: ${o.user} | Name: "${o.shippingAddress?.fullName || o.customerName || ''}" | Status: ${o.orderStatus || o.status} | Total: ${o.totalAmount || o.total} | Date: ${o.createdAt}`));

console.log("\n=== REVIEWS ===");
const reviews = await mongoose.connection.collection("reviews").find({}).toArray();
reviews.forEach(r => console.log(`Review ID: ${r._id} | User: ${r.user} | Name: "${r.userName || r.name}" | Rating: ${r.rating} | Comment: "${r.comment}"`));

console.log("\n=== NOTIFICATIONS ===");
const notifications = await mongoose.connection.collection("notifications").find({}).toArray();
notifications.forEach(n => console.log(`Notification ID: ${n._id} | Title: "${n.title}" | Msg: "${n.message}"`));

console.log("\n=== BOOKINGS ===");
const bookings = await mongoose.connection.collection("bookings").find({}).toArray();
bookings.forEach(b => console.log(`Booking ID: ${b._id} | Name: "${b.name}" | Phone: "${b.phone}"`));

await mongoose.disconnect();
