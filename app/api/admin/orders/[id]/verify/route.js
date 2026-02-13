import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Order from "@/models/Order";

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { emailVerifiedByAdmin, phoneVerifiedByAdmin } = await request.json();
  const update = {};

  if (typeof emailVerifiedByAdmin === "boolean") update.emailVerifiedByAdmin = emailVerifiedByAdmin;
  if (typeof phoneVerifiedByAdmin === "boolean") update.phoneVerifiedByAdmin = phoneVerifiedByAdmin;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No verification fields provided" }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findByIdAndUpdate(params.id, update, { new: true });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true, order });
}
