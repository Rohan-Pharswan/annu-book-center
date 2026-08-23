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

const mongoUri = envVars.MONGODB_URI;

console.log("=== MONGODB CONNECTION & QUERY TIMING DIAGNOSTIC ===");

// Check Atlas Cluster host & region from URI
const hostMatch = mongoUri.match(/@([^/?]+)/);
console.log("Atlas Host from URI:", hostMatch ? hostMatch[1] : "Unknown");

// 1. Measure initial cold connection time
console.log("\n--- TEST 1: Cold Connection Time ---");
const t0 = performance.now();
await mongoose.connect(mongoUri, {
  bufferCommands: false,
  maxPoolSize: 10
});
const coldConnTime = performance.now() - t0;
console.log(`Cold connection established in: ${coldConnTime.toFixed(2)} ms`);

// 2. Measure subsequent cached connection check
console.log("\n--- TEST 2: Warm Cached Connection Check ---");
const t1 = performance.now();
if (mongoose.connection.readyState === 1) {
  // already connected
}
const warmConnCheck = performance.now() - t1;
console.log(`Warm connection check took: ${warmConnCheck.toFixed(4)} ms`);

const db = mongoose.connection.db;
const productsCol = db.collection("products");
const categoriesCol = db.collection("categories");
const discountsCol = db.collection("discounts");
const usersCol = db.collection("users");

// 3. Measure individual queries
console.log("\n--- TEST 3: Product API Query Timings ---");

// A. Product.find().sort({ createdAt: -1 }).skip(0).limit(12)
const tFind0 = performance.now();
const items = await productsCol.find({}).sort({ createdAt: -1 }).skip(0).limit(12).toArray();
const tFind = performance.now() - tFind0;
console.log(`Product.find().sort().limit(12) took: ${tFind.toFixed(2)} ms (returned ${items.length} items)`);

// B. Product.countDocuments({})
const tCount0 = performance.now();
const count = await productsCol.countDocuments({});
const tCount = performance.now() - tCount0;
console.log(`Product.countDocuments({}) took: ${tCount.toFixed(2)} ms (count = ${count})`);

// C. Discount.find({ active: true })
const tDisc0 = performance.now();
const discounts = await discountsCol.find({ active: true }).toArray();
const tDisc = performance.now() - tDisc0;
console.log(`Discount.find({ active: true }) took: ${tDisc.toFixed(2)} ms (returned ${discounts.length} discounts)`);

// D. Category.find().sort({ name: 1 })
const tCat0 = performance.now();
const categories = await categoriesCol.find({}).sort({ name: 1 }).toArray();
const tCat = performance.now() - tCat0;
console.log(`Category.find().sort({ name: 1 }) took: ${tCat.toFixed(2)} ms (returned ${categories.length} categories)`);

// E. User.findById()
const sampleUser = await usersCol.findOne({});
if (sampleUser) {
  const tUser0 = performance.now();
  const u = await usersCol.findOne({ _id: sampleUser._id }, { projection: { password: 0 } });
  const tUser = performance.now() - tUser0;
  console.log(`User.findById() took: ${tUser.toFixed(2)} ms`);
}

// 4. Query explain on products
console.log("\n--- TEST 4: Query Explain Plan ---");
const explainFind = await productsCol.find({}).sort({ createdAt: -1 }).limit(12).explain("executionStats");
console.log("Explain Product Find Winning Stage:", explainFind.queryPlanner?.winningPlan?.stage || explainFind.executionStats?.executionStages?.stage);
console.log("Total Docs Examined:", explainFind.executionStats?.totalDocsExamined);
console.log("Execution Time (MongoDB Server):", explainFind.executionStats?.executionTimeMillis, "ms");

// Check existing indexes on products collection
console.log("\n--- TEST 5: Existing Indexes ---");
const pIndexes = await productsCol.indexes();
console.log("Product indexes:", pIndexes.map(i => ({ name: i.name, key: i.key })));
const cIndexes = await categoriesCol.indexes();
console.log("Category indexes:", cIndexes.map(i => ({ name: i.name, key: i.key })));

// 5. Measure round-trip ping time to MongoDB Atlas
console.log("\n--- TEST 6: MongoDB Ping Round-Trip Latency (5 samples) ---");
for (let i = 1; i <= 5; i++) {
  const pingStart = performance.now();
  await db.command({ ping: 1 });
  const pingDuration = performance.now() - pingStart;
  console.log(`Ping ${i}: ${pingDuration.toFixed(2)} ms`);
}

await mongoose.disconnect();
