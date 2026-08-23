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

const baseUrl = "http://localhost:3000";

async function runBenchmark() {
  console.log("=== COMPREHENSIVE BACKEND PERFORMANCE MEASUREMENT ===");

  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find or create test user for auth testing
  let user = await db.collection("users").findOne({});
  const jwt = await import("jsonwebtoken");
  const token = jwt.default.sign(
    { userId: String(user._id), email: user.email, role: user.role || "customer", name: user.name },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `token=${token}`
  };

  const endpoints = [
    { name: "/api/products?page=1&limit=12", url: "/api/products?q=&category=&page=1&limit=12", headers: {} },
    { name: "/api/categories", url: "/api/categories", headers: {} },
    { name: "/api/auth/me", url: "/api/auth/me", headers: authHeaders },
    { name: "/api/cart", url: "/api/cart", headers: authHeaders },
    { name: "/api/wishlist", url: "/api/wishlist", headers: authHeaders }
  ];

  const results = {};

  for (const ep of endpoints) {
    console.log(`\nBenchmarking ${ep.name} (5 runs)...`);
    const timings = [];
    let payloadBytes = 0;
    let statusCode = 200;

    for (let r = 1; r <= 5; r++) {
      const start = performance.now();
      const res = await fetch(`${baseUrl}${ep.url}`, { headers: ep.headers });
      const duration = performance.now() - start;
      const text = await res.text();
      payloadBytes = Buffer.byteLength(text, "utf8");
      statusCode = res.status;
      timings.push(duration);
      console.log(`  Run ${r}: ${duration.toFixed(2)} ms (HTTP ${res.status}, ${payloadBytes} bytes)`);
    }

    const warmTimings = timings.slice(1);
    const avgWarm = warmTimings.reduce((a, b) => a + b, 0) / warmTimings.length;
    const minWarm = Math.min(...warmTimings);
    const maxWarm = Math.max(...warmTimings);

    results[ep.name] = {
      statusCode,
      payloadBytes,
      run1: timings[0].toFixed(2),
      avgWarm: avgWarm.toFixed(2),
      minWarm: minWarm.toFixed(2),
      maxWarm: maxWarm.toFixed(2)
    };
  }

  console.log("\n=================== FINAL PERFORMANCE SUMMARY ===================");
  console.table(results);
  console.log("=================================================================");

  await mongoose.disconnect();
}

runBenchmark().catch(console.error);
