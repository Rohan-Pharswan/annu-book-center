import fs from "fs";
import jwt from "jsonwebtoken";
import { getCustomerToStoreWhatsAppUrl } from "../lib/storeConfig.js";

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

async function checkLiveProduction() {
  console.log("=== INSPECTING LIVE PRODUCTION DOM & API (https://annu-book-center.vercel.app) ===");

  // Login with existing user
  const loginRes = await fetch("https://annu-book-center.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@annubookcenter.com", password: "AdminPassword123!" })
  });
  console.log("Login status:", loginRes.status);
  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : "";
  console.log("Got auth token from login:", Boolean(token));

  // 1. Fetch live /api/orders
  console.log("\n1. Fetching live /api/orders from production with session cookie...");
  const res = await fetch("https://annu-book-center.vercel.app/api/orders", {
    headers: { Cookie: `token=${token}` }
  });
  console.log("Response Status:", res.status);
  const data = await res.json();
  console.log("Live Orders Count for user:", data.orders?.length);

  if (data.orders && data.orders.length > 0) {
    const order = data.orders[0];
    console.log("\n2. Live Order Payload from DB:", {
      _id: order._id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.address,
      items: order.items,
      subtotalAmount: order.subtotalAmount,
      totalSavings: order.totalSavings,
      totalAmount: order.totalAmount,
      deliveryChargeStatus: order.deliveryChargeStatus
    });

    const userProfile = { name: "Rohan Pharswan", phone: "8218479603" };
    const orderSpecificHref = getCustomerToStoreWhatsAppUrl(order, userProfile);
    console.log("\n3. 'Send Order Details to WhatsApp' button href on Orders Page:");
    console.log(orderSpecificHref);

    const decoded = decodeURIComponent(orderSpecificHref.split("text=")[1]);
    console.log("\n4. Decoded WhatsApp Order Message:");
    console.log(decoded);
  }

  // 2. Fetch live /orders page HTML and verify scripts/structure
  console.log("\n5. Fetching live /orders page HTML from Vercel...");
  const pageRes = await fetch("https://annu-book-center.vercel.app/orders");
  console.log("Orders page status:", pageRes.status);
  const pageHtml = await pageRes.text();
  console.log("HTML length:", pageHtml.length);
  console.log("Contains AuthGate:", pageHtml.includes("AuthGate") || pageHtml.includes("My Orders"));
}

checkLiveProduction().catch(console.error);
