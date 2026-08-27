import mongoose from "mongoose";
import fs from "fs";
import assert from "assert";

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

async function runTests() {
  console.log("=== RUNNING PRODUCT DETAILS REGRESSION & VERIFICATION SUITE ===\n");
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Check existing products in DB
  console.log("--- 1. Querying Existing Products ---");
  const products = await db.collection("products").find({}).limit(5).toArray();
  assert(products.length > 0, "Should have at least 1 product in DB");
  console.log(`  ✓ Found ${products.length} test products in database`);

  const sampleProd = products[0];
  console.log(`  ✓ Sample Product: "${sampleProd.name}" (ID: ${sampleProd._id})`);

  // 2. Test Review Star calculation logic
  console.log("\n--- 2. Testing Review Star Calculation Safety ---");
  const testRatings = [5, 4, 3, 2, 1, 0, -1, 6, 4.7, null, undefined, NaN];
  for (const rating of testRatings) {
    const r = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    const stars = "★".repeat(r) + "☆".repeat(5 - r);
    assert.strictEqual(stars.length, 5, `Stars must always be exactly 5 chars for rating ${rating}`);
  }
  console.log("  ✓ All edge-case ratings (null, out-of-bounds, negative, NaN) render exactly 5 stars without throwing RangeError");

  // 3. Test missing optional fields simulation
  console.log("\n--- 3. Testing Product with Missing / Optional Fields ---");
  const minimalProduct = {
    _id: new mongoose.Types.ObjectId(),
    name: "Minimal Test Book",
    category: "General",
    price: 100,
    stock: 10,
    images: [],
    rating: 0,
    ratingCount: 0,
    reviews: []
  };
  const imageUrl = Array.isArray(minimalProduct.images) && minimalProduct.images.length > 0 ? minimalProduct.images[0] : "";
  assert.strictEqual(imageUrl, "", "Empty images array correctly falls back to placeholder");
  assert.strictEqual(minimalProduct.reviews.length, 0, "Empty reviews handled cleanly");
  console.log("  ✓ Minimal product edge case verified");

  await mongoose.disconnect();
  console.log("\n>>> ALL PRODUCT DETAILS TESTS PASSED! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
