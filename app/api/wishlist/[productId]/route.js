import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request, { params }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const user = await User.findById(auth.user._id);
  const exists = user.wishlist.some((id) => String(id) === params.productId);
  if (!exists) user.wishlist.push(params.productId);
  await user.save();
  return NextResponse.json({ success: true, wishlist: user.wishlist });
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const user = await User.findById(auth.user._id);
  user.wishlist = user.wishlist.filter((id) => String(id) !== params.productId);
  await user.save();
  return NextResponse.json({ success: true, wishlist: user.wishlist });
}

