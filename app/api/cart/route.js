import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, DEFAULT_DELIVERY_CHARGE, getBestDiscountForProduct } from "@/lib/pricing";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const user = await User.findById(auth.user._id).populate("cart.product");
  const discounts = await Discount.find({ active: true }).lean();

  let subtotalAmount = 0;
  let discountedSubtotal = 0;
  let totalSavings = 0;

  const cart = user.cart.map((item) => {
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
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId, quantity = 1 } = await request.json();
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  await connectDB();
  const user = await User.findById(auth.user._id);
  const index = user.cart.findIndex((item) => String(item.product) === productId);
  if (index >= 0) user.cart[index].quantity += Number(quantity);
  else user.cart.push({ product: productId, quantity: Number(quantity) });

  await user.save();
  return NextResponse.json({ success: true, cart: user.cart });
}

export async function PATCH(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId, quantity } = await request.json();
  if (!productId || !quantity) {
    return NextResponse.json({ error: "productId and quantity are required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(auth.user._id);
  const item = user.cart.find((cartItem) => String(cartItem.product) === productId);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  item.quantity = Math.max(1, Number(quantity));
  await user.save();
  return NextResponse.json({ success: true, cart: user.cart });
}

export async function DELETE(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  await connectDB();
  const user = await User.findById(auth.user._id);
  user.cart = user.cart.filter((item) => String(item.product) !== productId);
  await user.save();

  return NextResponse.json({ success: true, cart: user.cart });
}
