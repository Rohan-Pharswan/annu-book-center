import mongoose from "mongoose";
import fs from "fs";

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

async function main() {
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;
  const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log("LATEST 5 REAL ORDERS IN MONGODB:");
  for (const o of orders) {
    console.log({
      _id: o._id,
      userId: o.userId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      address: o.address,
      items: o.items,
      subtotalAmount: o.subtotalAmount,
      totalSavings: o.totalSavings,
      totalAmount: o.totalAmount,
      deliveryCharge: o.deliveryCharge,
      deliveryChargeStatus: o.deliveryChargeStatus,
      fulfillmentType: o.fulfillmentType,
      createdAt: o.createdAt
    });
  }
  await mongoose.disconnect();
}

main().catch(console.error);
