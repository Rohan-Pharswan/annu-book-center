import mongoose from "mongoose";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const lines = env.split("\n");
let uri = "";
let hasCloudinaryName = false;
let hasCloudinaryKey = false;
let hasCloudinarySecret = false;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith("MONGODB_URI=")) {
    uri = trimmed.substring("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
  }
  if (trimmed.startsWith("CLOUDINARY_CLOUD_NAME=")) {
    hasCloudinaryName = !!trimmed.substring("CLOUDINARY_CLOUD_NAME=".length).trim();
  }
  if (trimmed.startsWith("CLOUDINARY_API_KEY=")) {
    hasCloudinaryKey = !!trimmed.substring("CLOUDINARY_API_KEY=".length).trim();
  }
  if (trimmed.startsWith("CLOUDINARY_API_SECRET=")) {
    hasCloudinarySecret = !!trimmed.substring("CLOUDINARY_API_SECRET=".length).trim();
  }
}

console.log("Cloudinary env set:", { hasCloudinaryName, hasCloudinaryKey, hasCloudinarySecret });

await mongoose.connect(uri);
const db = mongoose.connection.db;
const productsCol = db.collection("products");
const totalProducts = await productsCol.countDocuments();
console.log("Total products count:", totalProducts);

const sample = await productsCol.find({}).limit(10).toArray();
let base64Count = 0;
let urlCount = 0;
let totalImageBytes = 0;

for (const p of sample) {
  console.log(`Product ID: ${p._id}, Name: ${p.name}, images count: ${p.images?.length}`);
  if (Array.isArray(p.images)) {
    for (let i = 0; i < p.images.length; i++) {
      const img = p.images[i];
      if (typeof img === "string") {
        const isB64 = img.startsWith("data:");
        if (isB64) {
          base64Count++;
          totalImageBytes += img.length;
          console.log(`  - img[${i}]: Base64 data URI (length: ${img.length} chars, prefix: ${img.slice(0, 30)}...)`);
        } else {
          urlCount++;
          console.log(`  - img[${i}]: URL (${img.slice(0, 50)}...)`);
        }
      } else if (typeof img === "object" && img !== null) {
        console.log(`  - img[${i}]: Object!`, Object.keys(img));
      }
    }
  }
}

console.log({ totalProductsSampled: sample.length, base64Count, urlCount, totalImageBytes });
await mongoose.disconnect();
