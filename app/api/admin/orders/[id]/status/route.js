import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import Notification from "@/models/Notification";


const ALLOWED = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export const PATCH = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const { status } = await request.json();
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();

  // First read the current order to know previousStatus
  const order = await Order.findById(id).populate("userId", "name email");
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const previousStatus = order.status;
  if (previousStatus === status) {
    return NextResponse.json({ success: true, order });
  }

  // Optimistic-lock: atomically transition status ONLY if it hasn't changed since we read it.
  // If a concurrent request already transitioned it, this update returns null → we return 409.
  const committed = await Order.findOneAndUpdate(
    { _id: order._id, status: previousStatus },
    { $set: { status } },
    { new: false } // return the old doc to confirm we "won" the race
  );

  if (!committed) {
    // Another request changed the status concurrently — reject this one
    return NextResponse.json(
      { error: "Order status was changed concurrently. Please refresh and try again." },
      { status: 409 }
    );
  }

  // We now exclusively own this state transition. Apply stock adjustments.
  if (previousStatus !== "Cancelled" && status === "Cancelled") {
    // Restore inventory when transitioning to Cancelled
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: Number(item.quantity || 0) }
        });
      }
    }
  } else if (previousStatus === "Cancelled" && status !== "Cancelled") {
    // Re-deduct inventory if un-cancelling
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -Number(item.quantity || 0) }
        });
      }
    }
  }

  // Fetch the updated order for the response
  const updatedOrder = await Order.findById(id).populate("userId", "name email");

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

  return NextResponse.json({ success: true, order: updatedOrder });
});


