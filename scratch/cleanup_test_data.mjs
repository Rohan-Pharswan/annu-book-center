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

async function cleanup() {
  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;
  const oRes = await db.collection("orders").deleteMany({ customerName: { $regex: /^Rohan/ } });
  const uRes = await db.collection("users").deleteMany({ email: { $regex: /^(test|live)\./ } });
  console.log(`Cleaned up ${oRes.deletedCount} test orders and ${uRes.deletedCount} test users.`);
  await mongoose.disconnect();
}

cleanup().catch(console.error);
