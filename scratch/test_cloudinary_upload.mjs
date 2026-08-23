import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

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

cloudinary.config({
  cloud_name: envVars.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY_API_SECRET,
  secure: true
});

console.log("Testing Cloudinary upload with a 1x1 test image...");
// 1x1 transparent PNG
const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

try {
  const res = await cloudinary.uploader.upload(testBase64, {
    folder: "annu-book-store/test",
    resource_type: "image"
  });

  console.log("Upload SUCCESSFUL!");
  console.log("Public ID:", res.public_id);
  console.log("Secure URL:", res.secure_url);

  console.log("Verifying HTTP GET on secure URL...");
  const fetchRes = await fetch(res.secure_url);
  console.log("HTTP status code:", fetchRes.status);
  console.log("Content-Type:", fetchRes.headers.get("content-type"));

  if (fetchRes.ok) {
    console.log("✓ Cloudinary connectivity and URL delivery VERIFIED!");
    // Clean up test image
    await cloudinary.uploader.destroy(res.public_id);
    console.log("✓ Test image cleaned up.");
  } else {
    console.error("✗ Failed to fetch uploaded image URL:", fetchRes.status);
  }
} catch (err) {
  console.error("✗ Cloudinary upload test FAILED:", err.message);
}
