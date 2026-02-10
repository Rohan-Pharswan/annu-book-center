import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json({ user: auth.user });
}

export async function PATCH(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  await connectDB();

  const update = {
    ...(body.name ? { name: body.name } : {}),
    ...(Array.isArray(body.addresses) ? { addresses: body.addresses } : {})
  };
  const user = await User.findByIdAndUpdate(auth.user._id, update, { new: true }).select("-password");
  return NextResponse.json({ success: true, user });
}

