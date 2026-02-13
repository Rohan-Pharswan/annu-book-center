import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Order from "@/models/Order";
import Notification from "@/models/Notification";

const ALLOWED = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { status } = await request.json();
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findById(params.id).populate("userId", "name email");
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const previousStatus = order.status;
  order.status = status;
  await order.save();

  if (previousStatus !== status) {
    const customer = order.userId?.name || order.userId?.email || "Customer";
    const title = status === "Cancelled" ? "Order cancelled" : "Order status updated";
    await Notification.create({
      type: "order_status_changed",
      title,
      message: `${customer}'s order #${String(order._id).slice(-6)} changed from ${previousStatus} to ${status}`,
      meta: {
        orderId: order._id,
        userId: order.userId?._id,
        previousStatus,
        status
      }
    });
  }

  return NextResponse.json({ success: true, order });
}
