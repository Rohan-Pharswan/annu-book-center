import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const user = await User.findById(auth.user._id).populate("cart.product");
  return NextResponse.json({ cart: user.cart });
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

