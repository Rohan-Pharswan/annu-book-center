import mongoose from "mongoose";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
let uri = "";
for (const l of env.split("\n")) {
  if (l.startsWith("MONGODB_URI=")) {
    uri = l.slice("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
  }
}

await mongoose.connect(uri);
const orders = await mongoose.connection.collection("orders").find({}).sort({ createdAt: -1 }).limit(5).toArray();

console.log("=== LATEST 5 ORDERS IN DATABASE ===");
orders.forEach((o) => {
  console.log({
    id: String(o._id),
    customerEmail: o.customerEmail,
    fulfillmentType: o.fulfillmentType,
    status: o.status,
    confirmationEmailSent: o.confirmationEmailSent,
    confirmationEmailStatus: o.confirmationEmailStatus,
    confirmationEmailError: o.confirmationEmailError,
    confirmationEmailMessageId: o.confirmationEmailMessageId,
    createdAt: o.createdAt
  });
});

await mongoose.disconnect();
