import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";


export const GET = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = status && status !== "All" ? { status } : {};
  const orders = await Order.find(query).sort({ createdAt: -1 }).populate("userId", "name email");
  return NextResponse.json({ orders });
});

export const DELETE = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Order id is required" }, { status: 400 });

  await connectDB();
  const order = await Order.findById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.status !== "Cancelled") {
    for (const item of order.items || []) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: Number(item.quantity || 0) }
        });
      }
    }
  }

  await Order.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
});

