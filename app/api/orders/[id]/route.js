import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import Order from "@/models/Order";

export async function GET(request, { params }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const query = auth.user.role === "admin" ? { _id: params.id } : { _id: params.id, userId: auth.user._id };
  const order = await Order.findOne(query);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}

