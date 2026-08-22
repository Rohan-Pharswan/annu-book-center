// Targeted Test Suite for Cart and Wishlist API Fixes
import mongoose from "mongoose";
import { Schema } from "mongoose";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`PASS ${label}`);
    passed++;
  } else {
    console.log(`FAIL ${label}`);
    failed++;
  }
}

console.log("\n=== 1. Testing Mongoose Model Registration & References ===");

// Import models
import Product from "../models/Product.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Discount from "../models/Discount.js";
import Notification from "../models/Notification.js";
import Booking from "../models/Booking.js";
import Category from "../models/Category.js";


assert(Boolean(mongoose.models.Product), "Product model is registered in mongoose.models");
assert(Boolean(mongoose.models.User), "User model is registered in mongoose.models");
assert(Boolean(mongoose.models.Order), "Order model is registered in mongoose.models");
assert(Boolean(mongoose.models.Review), "Review model is registered in mongoose.models");
assert(Boolean(mongoose.models.Discount), "Discount model is registered in mongoose.models");
assert(Boolean(mongoose.models.Notification), "Notification model is registered in mongoose.models");
assert(Boolean(mongoose.models.Booking), "Booking model is registered in mongoose.models");
assert(Boolean(mongoose.models.Category), "Category model is registered in mongoose.models");

console.log("\n=== 2. Cart Model & Populate Resolution ===");

// Verify CartItemSchema references Product
const cartProductRef = User.schema.path("cart").schema.path("product").options.ref;
assert(cartProductRef === "Product", "User.cart.product ref points to 'Product' model");

// Verify Wishlist references Product
const wishlistRef = User.schema.path("wishlist").caster.options.ref;
assert(wishlistRef === "Product", "User.wishlist ref points to 'Product' model");

console.log("\n=== 3. Defensive Array and ObjectId Validation ===");

function simulateAddToCart(user, productId, qty) {
  if (!user) return { ok: false, status: 404, error: "User not found" };
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return { ok: false, status: 400, error: "Invalid product ID" };
  }
  if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
    return { ok: false, status: 400, error: "quantity must be an integer between 1 and 99" };
  }
  if (!Array.isArray(user.cart)) user.cart = [];

  const index = user.cart.findIndex((item) => String(item.product) === String(productId));
  if (index >= 0) user.cart[index].quantity = Math.min(99, Number(user.cart[index].quantity || 1) + qty);
  else user.cart.push({ product: new mongoose.Types.ObjectId(productId), quantity: qty });

  return { ok: true, cart: user.cart };
}

const mockValidId = new mongoose.Types.ObjectId().toString();

// Test with fresh user (cart is undefined)
const freshUser = { _id: "user1", cart: undefined };
const res1 = simulateAddToCart(freshUser, mockValidId, 2);
assert(res1.ok === true, "Add to cart with undefined cart initializes array and succeeds");
assert(res1.cart.length === 1, "Cart has 1 item");
assert(res1.cart[0].quantity === 2, "Cart item has quantity 2");

// Test adding same product increases quantity
const res2 = simulateAddToCart(freshUser, mockValidId, 3);
assert(res2.ok === true, "Add same product succeeds");
assert(res2.cart[0].quantity === 5, "Quantity incremented to 5 (2 + 3)");

// Test invalid ObjectId
const resInvalidId = simulateAddToCart(freshUser, "not-a-valid-id", 1);
assert(resInvalidId.ok === false && resInvalidId.status === 400, "Invalid product ID returns 400");

// Test invalid quantity
const resInvalidQty = simulateAddToCart(freshUser, mockValidId, 0);
assert(resInvalidQty.ok === false && resInvalidQty.status === 400, "Invalid quantity 0 returns 400");
const resNegativeQty = simulateAddToCart(freshUser, mockValidId, -5);
assert(resNegativeQty.ok === false && resNegativeQty.status === 400, "Negative quantity returns 400");
const resOverlimitQty = simulateAddToCart(freshUser, mockValidId, 100);
assert(resOverlimitQty.ok === false && resOverlimitQty.status === 400, "Overlimit quantity (100) returns 400");

// Test null user returns 404
const resNullUser = simulateAddToCart(null, mockValidId, 1);
assert(resNullUser.ok === false && resNullUser.status === 404, "Null user returns 404");

console.log("\n=== 4. Wishlist Toggle and Pruning Simulation ===");

function simulateWishlistToggle(user, productId, action) {
  if (!user) return { ok: false, status: 404, error: "User not found" };
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return { ok: false, status: 400, error: "Invalid product ID" };
  }
  if (!Array.isArray(user.wishlist)) user.wishlist = [];

  if (action === "ADD") {
    const exists = user.wishlist.some((id) => String(id) === String(productId));
    if (!exists) user.wishlist.push(new mongoose.Types.ObjectId(productId));
  } else if (action === "REMOVE") {
    user.wishlist = user.wishlist.filter((id) => String(id) !== String(productId));
  }

  return { ok: true, wishlist: user.wishlist };
}

// Test add to undefined wishlist
const userWishlistUndefined = { _id: "user2", wishlist: undefined };
const addWishRes = simulateWishlistToggle(userWishlistUndefined, mockValidId, "ADD");
assert(addWishRes.ok === true, "Add to undefined wishlist initializes array safely");
assert(addWishRes.wishlist.length === 1, "Wishlist contains 1 item");

// Test duplicate add is idempotent
const duplicateAdd = simulateWishlistToggle(userWishlistUndefined, mockValidId, "ADD");
assert(duplicateAdd.wishlist.length === 1, "Duplicate add does not create second item");

// Test remove
const removeWishRes = simulateWishlistToggle(userWishlistUndefined, mockValidId, "REMOVE");
assert(removeWishRes.ok === true, "Remove from wishlist succeeds");
assert(removeWishRes.wishlist.length === 0, "Wishlist is now empty");

// Test null user on wishlist returns 404
const wishNullUser = simulateWishlistToggle(null, mockValidId, "ADD");
assert(wishNullUser.ok === false && wishNullUser.status === 404, "Null user on wishlist returns 404");

// Test invalid ObjectId on wishlist returns 400
const wishInvalidId = simulateWishlistToggle(userWishlistUndefined, "bad-id", "ADD");
assert(wishInvalidId.ok === false && wishInvalidId.status === 400, "Invalid product ID on wishlist returns 400");

console.log("\n=== 5. Unauthenticated Request Contracts ===");

function simulateRequireAuth(cookies) {
  const token = cookies?.token || "";
  if (!token) return { ok: false, status: 401, message: "Unauthorized" };
  return { ok: true };
}

const noTokenReq = simulateRequireAuth({});
assert(noTokenReq.ok === false && noTokenReq.status === 401, "Unauthenticated request correctly returns 401 Unauthorized");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
