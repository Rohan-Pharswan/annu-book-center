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

const collections = await db.listCollections().toArray();
console.log("=== COLLECTION INDEXES IN MONGODB ATLAS ===");
for (const col of collections) {
  const indexes = await db.collection(col.name).indexes();
  console.log(`\nCollection [${col.name}] (${await db.collection(col.name).countDocuments()} docs):`);
  for (const idx of indexes) {
    console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
  }
}

await mongoose.disconnect();
