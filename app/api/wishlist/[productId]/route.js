import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";

export const POST = withErrorHandling(async (request, { params }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { productId } = await params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(auth.user._id);
  const exists = user.wishlist.some((id) => String(id) === productId);
  if (!exists) user.wishlist.push(new mongoose.Types.ObjectId(productId));
  await user.save();
  return NextResponse.json({ success: true, wishlist: user.wishlist });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { productId } = await params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(auth.user._id);
  user.wishlist = user.wishlist.filter((id) => String(id) !== productId);
  await user.save();
  return NextResponse.json({ success: true, wishlist: user.wishlist });
});


