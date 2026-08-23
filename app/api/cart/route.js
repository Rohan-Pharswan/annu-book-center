import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";
import Product from "@/models/Product";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, DEFAULT_DELIVERY_CHARGE, getBestDiscountForProduct } from "@/lib/pricing";

export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const [user, discounts] = await Promise.all([
    User.findById(auth.user._id).populate("cart.product"),
    Discount.find({ active: true }).lean()
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!Array.isArray(user.cart)) user.cart = [];

  let subtotalAmount = 0;
  let discountedSubtotal = 0;
  let totalSavings = 0;

  const validCartItems = user.cart.filter((item) => Boolean(item.product && item.product._id));
  if (validCartItems.length !== user.cart.length) {
    user.cart = validCartItems;
    await user.save({ validateModifiedOnly: true });
  }

  const cart = validCartItems.map((item) => {
    const product = item.product?.toObject ? item.product.toObject() : item.product;
    const pricing = calculateDiscountedPrice(product?.price || 0, getBestDiscountForProduct(product, discounts));
    const quantity = Number(item.quantity || 1);
    subtotalAmount += pricing.originalPrice * quantity;
    discountedSubtotal += pricing.finalPrice * quantity;
    totalSavings += pricing.savings * quantity;

    return {
      ...item.toObject(),
      product: {
        ...product,
        ...pricing
      }
    };
  });

  const deliveryCharge = DEFAULT_DELIVERY_CHARGE;
  return NextResponse.json({
    cart,
    pricing: {
      subtotalAmount: Number(subtotalAmount.toFixed(2)),
      discountedSubtotal: Number(discountedSubtotal.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      deliveryCharge,
      totalAmount: Number((discountedSubtotal + deliveryCharge).toFixed(2))
    }
  });
});

export const POST = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId, quantity = 1 } = await request.json();
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
    return NextResponse.json({ error: "quantity must be an integer between 1 and 99" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(auth.user._id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!Array.isArray(user.cart)) user.cart = [];

  const index = user.cart.findIndex((item) => String(item.product) === productId);
  if (index >= 0) user.cart[index].quantity = Math.min(99, Number(user.cart[index].quantity || 1) + qty);
  else user.cart.push({ product: new mongoose.Types.ObjectId(productId), quantity: qty });

  await user.save({ validateModifiedOnly: true });
  return NextResponse.json({ success: true, cart: user.cart });
});

export const PATCH = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId, quantity } = await request.json();
  if (!productId || quantity === undefined) {
    return NextResponse.json({ error: "productId and quantity are required" }, { status: 400 });
  }
  const qty = Number(quantity);

  await connectDB();
  const user = await User.findById(auth.user._id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!Array.isArray(user.cart)) user.cart = [];

  if (qty <= 0) {
    user.cart = user.cart.filter((cartItem) => String(cartItem.product) !== productId);
    await user.save({ validateModifiedOnly: true });
    return NextResponse.json({ success: true, cart: user.cart });
  }

  if (!Number.isInteger(qty) || qty > 99) {
    return NextResponse.json({ error: "quantity must be an integer between 1 and 99" }, { status: 400 });
  }

  const item = user.cart.find((cartItem) => String(cartItem.product) === productId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  item.quantity = qty;
  await user.save({ validateModifiedOnly: true });
  return NextResponse.json({ success: true, cart: user.cart });
});

export const DELETE = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  await connectDB();
  const user = await User.findById(auth.user._id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!Array.isArray(user.cart)) user.cart = [];

  user.cart = user.cart.filter((item) => String(item.product) !== productId);
  await user.save({ validateModifiedOnly: true });

  return NextResponse.json({ success: true, cart: user.cart });
});


