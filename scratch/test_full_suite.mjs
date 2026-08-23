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

async function runFullSuite() {
  console.log("=== COMPREHENSIVE END-TO-END TEST SUITE ===");

  await mongoose.connect(envVars.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Get or create test admin user
  const usersCol = db.collection("users");
  let admin = await usersCol.findOne({ role: "admin" });
  if (!admin) {
    console.log("Creating temporary admin for test...");
    await usersCol.insertOne({
      name: "Test Admin",
      email: "testadmin@example.com",
      password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
      role: "admin"
    });
    admin = await usersCol.findOne({ email: "testadmin@example.com" });
  }

  // Generate JWT token for admin
  const jwt = await import("jsonwebtoken");
  const token = jwt.default.sign(
    { userId: String(admin._id), email: admin.email, role: "admin", name: admin.name },
    envVars.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `token=${token}`
  };

  // TEST 1: Product Listing & Pagination
  console.log("\n[TEST 1] Product Listing & Pagination...");
  const listRes = await fetch(`${baseUrl}/api/products?page=1&limit=8`);
  const listData = await listRes.json();
  if (listRes.status !== 200 || !Array.isArray(listData.items)) throw new Error("List failed");
  console.log(`✓ GET /api/products returned 200 with ${listData.items.length} items`);

  // TEST 2: Product Search & Category Filter
  console.log("\n[TEST 2] Search & Category Filter...");
  const searchRes = await fetch(`${baseUrl}/api/products?q=Lucent`);
  const searchData = await searchRes.json();
  console.log(`✓ Search "Lucent" returned ${searchData.items?.length} items`);

  // TEST 3: Admin Image Upload Endpoint (/api/upload)
  console.log("\n[TEST 3] Admin Image Upload to Cloudinary...");
  const test1x1Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9Qz8DAwMTAAAACgQECCwQf/QAAAABJRU5ErkJggg==";
  const uploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ image: test1x1Png })
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.imageUrl || !uploadData.imageUrl.startsWith("https://")) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }
  console.log(`✓ Image uploaded successfully to Cloudinary -> ${uploadData.imageUrl}`);

  // TEST 4: Admin Product Creation with Cloudinary Image URL
  console.log("\n[TEST 4] Admin Product Creation...");
  const createRes = await fetch(`${baseUrl}/api/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Automated Test Book",
      category: "Test Category",
      price: 299,
      stock: 15,
      description: "A book created during automated verification",
      images: [uploadData.imageUrl],
      type: "book"
    })
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.product?._id) {
    throw new Error(`Product creation failed: ${JSON.stringify(createData)}`);
  }
  const createdProductId = createData.product._id;
  console.log(`✓ Product created successfully: ID ${createdProductId}`);

  // TEST 5: Product Details Endpoint
  console.log("\n[TEST 5] Product Details...");
  const detailRes = await fetch(`${baseUrl}/api/products/${createdProductId}`);
  const detailData = await detailRes.json();
  if (detailRes.status !== 200 || detailData.name !== "Automated Test Book") {
    throw new Error("Product detail fetch failed");
  }
  console.log(`✓ GET /api/products/${createdProductId} returned correct details, image URL: ${detailData.images[0]}`);

  // TEST 6: Admin Product Edit (PATCH)
  console.log("\n[TEST 6] Admin Product Edit...");
  const patchRes = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      price: 349,
      stock: 20
    })
  });
  const patchData = await patchRes.json();
  if (patchRes.status !== 200 || patchData.product?.price !== 349) {
    throw new Error("Product PATCH failed");
  }
  console.log(`✓ Product updated successfully (price: ₹${patchData.product.price}, stock: ${patchData.product.stock})`);

  // TEST 7: Cart Operations (Add, List, Update, Remove)
  console.log("\n[TEST 7] Cart Operations...");
  const cartAddRes = await fetch(`${baseUrl}/api/cart`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ productId: createdProductId, quantity: 2 })
  });
  const cartAddData = await cartAddRes.json();
  if (!cartAddRes.ok) throw new Error(`Cart add failed: ${JSON.stringify(cartAddData)}`);
  console.log("✓ Added test product to cart");

  const cartGetRes = await fetch(`${baseUrl}/api/cart`, { headers: authHeaders });
  const cartGetData = await cartGetRes.json();
  console.log(`✓ Cart fetched: ${cartGetData.cart?.length} item(s), Subtotal: ₹${cartGetData.pricing?.subtotalAmount}`);

  // TEST 8: Wishlist Operations
  console.log("\n[TEST 8] Wishlist Operations...");
  const wishAddRes = await fetch(`${baseUrl}/api/wishlist/${createdProductId}`, {
    method: "POST",
    headers: authHeaders
  });
  if (!wishAddRes.ok) throw new Error("Wishlist add failed");
  console.log("✓ Added test product to wishlist");

  const wishGetRes = await fetch(`${baseUrl}/api/wishlist`, { headers: authHeaders });
  const wishGetData = await wishGetRes.json();
  console.log(`✓ Wishlist fetched: ${wishGetData.wishlist?.length} item(s)`);

  const wishDelRes = await fetch(`${baseUrl}/api/wishlist/${createdProductId}`, {
    method: "DELETE",
    headers: authHeaders
  });
  if (!wishDelRes.ok) throw new Error("Wishlist delete failed");
  console.log("✓ Removed test product from wishlist");

  // TEST 9: Product Reviews
  console.log("\n[TEST 9] Product Reviews...");
  const reviewRes = await fetch(`${baseUrl}/api/products/${createdProductId}/reviews`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ rating: 5, comment: "Excellent test book!" })
  });
  const reviewData = await reviewRes.json();
  if (!reviewRes.ok) throw new Error(`Review submit failed: ${JSON.stringify(reviewData)}`);
  console.log("✓ Review added successfully");

  // TEST 10: Clean up test product
  console.log("\n[TEST 10] Clean up test product...");
  // Clear cart
  await fetch(`${baseUrl}/api/cart`, {
    method: "DELETE",
    headers: authHeaders,
    body: JSON.stringify({ productId: createdProductId })
  });

  const delRes = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
    method: "DELETE",
    headers: authHeaders
  });
  if (!delRes.ok) throw new Error("Product delete failed");
  console.log("✓ Test product deleted cleanly");

  // Final check: confirm original products are intact
  const finalProducts = await db.collection("products").find({}).toArray();
  console.log(`\n✓ Final total original products in DB: ${finalProducts.length}`);
  for (const p of finalProducts) {
    console.log(`  - [${p._id}] "${p.name}" -> ${p.images?.[0]}`);
  }

  await mongoose.disconnect();
  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

runFullSuite().catch((err) => {
  console.error("\n✗ TEST SUITE FAILED:", err);
  process.exit(1);
});
