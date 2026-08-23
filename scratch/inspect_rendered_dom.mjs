import mongoose from "mongoose";
import fs from "fs";
import jwt from "jsonwebtoken";

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

async function testDom() {
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find a real order in the database
  const order = await db.collection("orders").findOne({ fulfillmentType: "doorstep" }) 
    || await db.collection("orders").findOne({});

  console.log("Using Database Order ID:", order._id);
  console.log("Order items:", order.items);
  console.log("Order address:", order.address);

  // Import storeConfig
  const { getCustomerToStoreWhatsAppUrl } = await import("./lib/storeConfig.js");
  const href = getCustomerToStoreWhatsAppUrl(order, { name: "Rohan Pharswan", phone: "9876543210" });
  console.log("\nRENDERED HREF ON BUTTON:");
  console.log(href);

  const urlObj = new URL(href);
  const decodedText = decodeURIComponent(urlObj.searchParams.get("text"));
  console.log("\nDECODED searchParams.get('text'):");
  console.log(decodedText);

  await mongoose.disconnect();
}

testDom().catch(console.error);
