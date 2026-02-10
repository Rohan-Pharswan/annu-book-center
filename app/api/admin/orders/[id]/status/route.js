import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Order from "@/models/Order";

const ALLOWED = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { status } = await request.json();
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findByIdAndUpdate(params.id, { status }, { new: true });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true, order });
}

