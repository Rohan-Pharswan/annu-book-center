import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Order from "@/models/Order";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const orders = await Order.find().sort({ createdAt: -1 }).populate("userId", "name email");
  return NextResponse.json({ orders });
}

