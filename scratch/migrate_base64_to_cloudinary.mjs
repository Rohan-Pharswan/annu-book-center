import mongoose from "mongoose";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// 1. Read environment variables from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    envVars[key] = val;
  }
}

const mongoUri = envVars.MONGODB_URI;
const cloudName = envVars.CLOUDINARY_CLOUD_NAME;
const apiKey = envVars.CLOUDINARY_API_KEY;
const apiSecret = envVars.CLOUDINARY_API_SECRET;

console.log("=== CLOUDINARY PRODUCT IMAGE MIGRATION ===");
console.log("Checking Cloudinary Configuration...");

if (!cloudName || !apiKey || !apiSecret) {
  console.error("ERROR: Cloudinary credentials are missing in .env.local!");
  console.error("Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env.local before running migration.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

console.log(`Cloudinary configured for cloud_name: "${cloudName}"`);
console.log("Connecting to MongoDB Atlas...");
await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const productsCol = db.collection("products");

const totalProducts = await productsCol.countDocuments();
console.log(`Total products in database: ${totalProducts}`);

// Find products with base64 images
const allProducts = await productsCol.find({}).toArray();

let migratedCount = 0;
let skippedCount = 0;
let errorCount = 0;
let totalUploadedImages = 0;

for (const product of allProducts) {
  const productId = String(product._id);
  const images = Array.isArray(product.images) ? product.images : [];
  const hasBase64 = images.some((img) => typeof img === "string" && img.startsWith("data:image/"));

  if (!hasBase64) {
    console.log(`[SKIPPED] Product "${product.name}" (${productId}) has no Base64 images.`);
    skippedCount++;
    continue;
  }

  console.log(`\n[PROCESSING] Product "${product.name}" (${productId}) with ${images.length} image(s)...`);

  const updatedImages = [];
  let productFailed = false;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (typeof img === "string" && img.startsWith("data:image/")) {
      console.log(`  Uploading image [${i}] (${Math.round(img.length / 1024)} KB) to Cloudinary...`);
      try {
        const uploadResult = await cloudinary.uploader.upload(img, {
          folder: "annu-book-store/products",
          resource_type: "image",
          transformation: [
            {
              quality: "auto:good",
              fetch_format: "auto",
              flags: "lossy"
            }
          ]
        });

        const newUrl = uploadResult.secure_url;
        if (!newUrl || !newUrl.startsWith("https://")) {
          throw new Error(`Upload did not return a valid HTTPS URL: ${newUrl}`);
        }

        // Verify URL is reachable
        console.log(`  Verifying URL: ${newUrl}...`);
        const verifyRes = await fetch(newUrl, { method: "HEAD" });
        if (!verifyRes.ok) {
          throw new Error(`URL verification failed with HTTP status ${verifyRes.status}`);
        }

        console.log(`  ✓ Verified reachable (HTTP ${verifyRes.status}) -> ${newUrl}`);
        updatedImages.push(newUrl);
        totalUploadedImages++;
      } catch (err) {
        console.error(`  ✗ Failed to upload/verify image [${i}]:`, err.message);
        productFailed = true;
        break;
      }
    } else if (typeof img === "string" && img.trim().length > 0) {
      console.log(`  Image [${i}] is already a URL: ${img.slice(0, 60)}... (keeping)`);
      updatedImages.push(img);
    }
  }

  if (productFailed) {
    console.error(`  [ABORTED] Product "${product.name}" (${productId}) was NOT updated due to upload error.`);
    errorCount++;
    continue;
  }

  // Update MongoDB document
  const updateResult = await productsCol.updateOne(
    { _id: product._id },
    { $set: { images: updatedImages } }
  );

  if (updateResult.modifiedCount === 1) {
    console.log(`  ✓ Successfully updated MongoDB product ${productId} with ${updatedImages.length} URL(s).`);
    migratedCount++;
  } else {
    console.warn(`  ! MongoDB update returned modifiedCount: ${updateResult.modifiedCount}`);
  }
}

console.log("\n================ MIGRATION SUMMARY ================");
console.log(`Total Products Scanned : ${allProducts.length}`);
console.log(`Products Migrated      : ${migratedCount}`);
console.log(`Products Skipped       : ${skippedCount}`);
console.log(`Errors / Aborted       : ${errorCount}`);
console.log(`Total Images Uploaded  : ${totalUploadedImages}`);
console.log("===================================================\n");

// Final verification of DB state
const remainingBase64 = await productsCol.countDocuments({
  images: { $elemMatch: { $regex: /^data:image\// } }
});
console.log(`Remaining products with Base64 in database: ${remainingBase64}`);

await mongoose.disconnect();
console.log("Disconnected from MongoDB.");
