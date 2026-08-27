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

console.log("=========================================");
console.log("STARTING DATABASE CLEANUP");
console.log("=========================================");

// 1. Genuine user emails to preserve
const KEPT_EMAILS = [
  "rohanpharswan11@gmail.com", // Admin (Mahendra Pharswan)
  "kumar796681@gmail.com",     // User (Abhishek)
  "radhikakahera24@gmail.com"  // User (Radhika Kahera)
];

// List users before
const allUsersBefore = await mongoose.connection.collection("users").find({}).toArray();
console.log(`\nInitial Users (${allUsersBefore.length}):`);
allUsersBefore.forEach(u => console.log(` - [${u._id}] ${u.name} (${u.email}) [${u.role}]`));

// Delete users NOT in KEPT_EMAILS
const deleteUsersResult = await mongoose.connection.collection("users").deleteMany({
  email: { $nin: KEPT_EMAILS }
});
console.log(`\nDeleted ${deleteUsersResult.deletedCount} test / non-genuine users.`);

// 2. Orders cleanup (Delete test orders / testetest orders)
const allOrdersBefore = await mongoose.connection.collection("orders").find({}).toArray();
console.log(`\nInitial Orders (${allOrdersBefore.length}):`);
allOrdersBefore.forEach(o => console.log(` - [${o._id}] Customer: "${o.customerName || o.shippingAddress?.fullName || ''}" (${o.customerEmail || o.shippingAddress?.email || ''}) - Status: ${o.status || o.orderStatus}`));

// Delete all test orders
const deleteOrdersResult = await mongoose.connection.collection("orders").deleteMany({});
console.log(`\nDeleted ${deleteOrdersResult.deletedCount} test orders.`);

// 3. Reviews cleanup
const deleteReviewsResult = await mongoose.connection.collection("reviews").deleteMany({});
console.log(`\nDeleted ${deleteReviewsResult.deletedCount} test reviews.`);

// Reset rating & ratingCount on products
const resetProductsResult = await mongoose.connection.collection("products").updateMany(
  {},
  { $set: { rating: 0, ratingCount: 0 } }
);
console.log(`Reset ratings on ${resetProductsResult.modifiedCount} products.`);

// 4. Notifications cleanup
const deleteNotificationsResult = await mongoose.connection.collection("notifications").deleteMany({});
console.log(`Deleted ${deleteNotificationsResult.deletedCount} test notifications.`);

// 5. Bookings cleanup (if any)
const deleteBookingsResult = await mongoose.connection.collection("bookings").deleteMany({});
console.log(`Deleted ${deleteBookingsResult.deletedCount} test bookings.`);

// Verify preserved users
const usersAfter = await mongoose.connection.collection("users").find({}).toArray();
console.log(`\n=========================================`);
console.log(`REMAINING USERS IN DATABASE (${usersAfter.length}):`);
usersAfter.forEach(u => {
  console.log(` - ID: ${u._id} | Name: "${u.name}" | Email: "${u.email}" | Role: "${u.role}"`);
});

const ordersAfter = await mongoose.connection.collection("orders").countDocuments();
const reviewsAfter = await mongoose.connection.collection("reviews").countDocuments();
const notificationsAfter = await mongoose.connection.collection("notifications").countDocuments();
const productsCount = await mongoose.connection.collection("products").countDocuments();

console.log(`\nRemaining Orders: ${ordersAfter}`);
console.log(`Remaining Reviews: ${reviewsAfter}`);
console.log(`Remaining Notifications: ${notificationsAfter}`);
console.log(`Active Products in Store: ${productsCount}`);
console.log("=========================================");
console.log("CLEANUP COMPLETED SUCCESSFULLY");
console.log("=========================================");

await mongoose.disconnect();
