import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  return NextResponse.json({ users });
}

