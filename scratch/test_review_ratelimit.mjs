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

async function testReviewRateLimiting() {
  console.log("=== REVIEW RATE LIMITING VERIFICATION ===");

  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Get a sample product
  const product = await db.collection("products").findOne({});
  if (!product) throw new Error("No product found in DB");
  const productId = String(product._id);
  console.log(`Using target product: "${product.name}" (${productId})`);

  // 2. Create unique test user token
  const jwt = await import("jsonwebtoken");
  const testUserId = new mongoose.Types.ObjectId();
  const testToken = jwt.default.sign(
    { userId: String(testUserId), email: "reviewtester@example.com", role: "customer", name: "Review Tester" },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // We need the user to exist in DB for requireAuth
  await db.collection("users").insertOne({
    _id: testUserId,
    name: "Review Tester",
    email: `tester_${Date.now()}@example.com`,
    password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
    role: "customer"
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `token=${testToken}`
  };

  try {
    console.log("\nTesting 5 allowed review submissions...");
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ rating: 5, comment: `Review attempt #${i}` })
      });
      const data = await res.json();
      console.log(`  Submission #${i}: HTTP ${res.status} -> success: ${data.success}`);
      if (res.status !== 200 || !data.success) {
        throw new Error(`Submission #${i} failed unexpectedly: ${JSON.stringify(data)}`);
      }
    }

    console.log("\nTesting 6th submission (should trigger HTTP 429)...");
    const res6 = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ rating: 5, comment: "Review attempt #6 (should be blocked)" })
    });
    const data6 = await res6.json();
    console.log(`  Submission #6: HTTP ${res6.status} -> error: "${data6.error}"`);

    if (res6.status !== 429) {
      throw new Error(`Expected HTTP 429 on 6th request, got HTTP ${res6.status}: ${JSON.stringify(data6)}`);
    }
    console.log("✓ Rate limit successfully enforced HTTP 429 on 6th submission!");

    // Test that a different user is NOT blocked
    console.log("\nTesting that a different user is NOT blocked...");
    const anotherUserId = new mongoose.Types.ObjectId();
    await db.collection("users").insertOne({
      _id: anotherUserId,
      name: "Different User",
      email: `another_${Date.now()}@example.com`,
      password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
      role: "customer"
    });
    const anotherToken = jwt.default.sign(
      { userId: String(anotherUserId), email: "another@example.com", role: "customer", name: "Different User" },
      envVars.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const anotherRes = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `token=${anotherToken}` },
      body: JSON.stringify({ rating: 4, comment: "Independent user review" })
    });
    const anotherData = await anotherRes.json();
    console.log(`  Different user submission: HTTP ${anotherRes.status} -> success: ${anotherData.success}`);
    if (anotherRes.status !== 200 || !anotherData.success) {
      throw new Error(`Different user was incorrectly blocked: ${JSON.stringify(anotherData)}`);
    }
    console.log("✓ Per-user isolation verified: other users are not affected!");

    // Clean up test data
    await db.collection("users").deleteMany({ _id: { $in: [testUserId, anotherUserId] } });
    await db.collection("reviews").deleteMany({ userId: { $in: [testUserId, anotherUserId] } });
    console.log("✓ Test users & reviews cleaned up.");

  } finally {
    await mongoose.disconnect();
  }

  console.log("\n>>> REVIEW RATE LIMIT TESTS PASSED SUCCESSFULLY! <<<");
}

testReviewRateLimiting().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
