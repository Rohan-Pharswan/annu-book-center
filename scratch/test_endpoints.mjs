import mongoose from "mongoose";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const lines = env.split("\n");
let uri = "";
for (const line of lines) {
  if (line.startsWith("MONGODB_URI=")) {
    uri = line.substring("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");
  }
}

await mongoose.connect(uri);

// Import models
import User from "../models/User.js";
import Product from "../models/Product.js";
import Discount from "../models/Discount.js";

console.log("=== Testing Real DB User & Cart / Wishlist operations ===");

try {
  // Find a sample user
  const user = await User.findOne({});
  if (!user) {
    console.log("No user found in DB");
  } else {
    console.log(`Found user: ${user._id}, email: ${user.email}`);

    // 1. Test GET Cart logic
    console.log("\n--- Testing GET /api/cart logic ---");
    const cartUser = await User.findById(user._id).populate("cart.product");
    if (!Array.isArray(cartUser.cart)) cartUser.cart = [];
    const validCartItems = cartUser.cart.filter((item) => Boolean(item.product && item.product._id));
    console.log(`Cart items count: ${cartUser.cart.length}, Valid cart items: ${validCartItems.length}`);
    console.log("GET /api/cart DB query succeeded!");

    // 2. Test GET Wishlist logic
    console.log("\n--- Testing GET /api/wishlist logic ---");
    const wishUser = await User.findById(user._id).populate("wishlist");
    if (!Array.isArray(wishUser.wishlist)) wishUser.wishlist = [];
    const validWishlistProducts = (wishUser.wishlist || []).filter((p) => Boolean(p && p._id));
    console.log(`Wishlist count: ${wishUser.wishlist.length}, Valid: ${validWishlistProducts.length}`);
    console.log("GET /api/wishlist DB query succeeded!");

    // 3. Test POST /api/cart
    console.log("\n--- Testing POST /api/cart logic ---");
    const sampleProduct = await Product.findOne({});
    if (sampleProduct) {
      console.log(`Sample product found: ${sampleProduct._id} (${sampleProduct.name})`);
      const postUser = await User.findById(user._id);
      if (!Array.isArray(postUser.cart)) postUser.cart = [];
      const index = postUser.cart.findIndex((item) => String(item.product) === String(sampleProduct._id));
      if (index >= 0) postUser.cart[index].quantity = Math.min(99, Number(postUser.cart[index].quantity || 1) + 1);
      else postUser.cart.push({ product: sampleProduct._id, quantity: 1 });
      await postUser.save();
      console.log("POST /api/cart succeeded!");

      // 4. Test POST /api/wishlist/[productId]
      console.log("\n--- Testing POST /api/wishlist logic ---");
      const wishPostUser = await User.findById(user._id);
      if (!Array.isArray(wishPostUser.wishlist)) wishPostUser.wishlist = [];
      const exists = wishPostUser.wishlist.some((id) => String(id) === String(sampleProduct._id));
      if (!exists) wishPostUser.wishlist.push(sampleProduct._id);
      await wishPostUser.save();
      console.log("POST /api/wishlist succeeded!");
    } else {
      console.log("No product found in DB");
    }
  }
} catch (err) {
  console.error("ENDPOINT TEST ERROR:", err);
} finally {
  await mongoose.disconnect();
}
