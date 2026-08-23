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

await mongoose.connect(envVars.MONGODB_URI);
const db = mongoose.connection.db;

console.log("Creating required indexes in MongoDB Atlas...");

// 1. products: createdAt: -1
await db.collection("products").createIndex({ createdAt: -1 });
console.log("✓ Created index products { createdAt: -1 }");

// 2. products: category: 1, createdAt: -1
await db.collection("products").createIndex({ category: 1, createdAt: -1 });
console.log("✓ Created index products { category: 1, createdAt: -1 }");

// 3. discounts: active: 1
await db.collection("discounts").createIndex({ active: 1 });
console.log("✓ Created index discounts { active: 1 }");

const pIndexes = await db.collection("products").indexes();
console.log("\nUpdated Products Indexes:", pIndexes.map(i => i.name));

const dIndexes = await db.collection("discounts").indexes();
console.log("Updated Discounts Indexes:", dIndexes.map(i => i.name));

await mongoose.disconnect();
console.log("Index creation complete.");
