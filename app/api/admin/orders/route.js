import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Order from "@/models/Order";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = status && status !== "All" ? { status } : {};
  const orders = await Order.find(query).sort({ createdAt: -1 }).populate("userId", "name email");
  return NextResponse.json({ orders });
}

export async function DELETE(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });

  await connectDB();
  const deleted = await Order.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
