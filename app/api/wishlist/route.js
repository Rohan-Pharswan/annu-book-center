import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();
  const user = await User.findById(auth.user._id).populate("wishlist");
  return NextResponse.json({ wishlist: user.wishlist });
}

