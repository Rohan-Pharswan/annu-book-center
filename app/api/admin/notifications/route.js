import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Notification from "@/models/Notification";
import Order from "@/models/Order";

export const GET = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || "50");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const query = unreadOnly ? { read: false } : {};

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ read: false })
  ]);

  // Live order synchronization for order notifications
  const orderIds = notifications
    .map((n) => n.meta?.orderId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  if (orderIds.length > 0) {
    const orders = await Order.find({ _id: { $in: orderIds } })
      .select("status deliveryCharge deliveryChargeStatus totalAmount subtotalAmount totalSavings")
      .lean();

    const orderMap = new Map();
    for (const o of orders) {
      orderMap.set(String(o._id), o);
    }

    for (const n of notifications) {
      if (n.meta?.orderId) {
        const liveOrder = orderMap.get(String(n.meta.orderId));
        if (liveOrder) {
          n.meta.liveOrderStatus = liveOrder.status;
          n.meta.liveDeliveryChargeStatus = liveOrder.deliveryChargeStatus;
          n.meta.liveDeliveryCharge = liveOrder.deliveryCharge;
          n.meta.liveTotalAmount = liveOrder.totalAmount;
          n.meta.liveSubtotalAmount = liveOrder.subtotalAmount;
        }
      }
    }
  }

  return NextResponse.json({ notifications, unreadCount });
});

export const PATCH = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id, markAllRead } = await request.json();
  await connectDB();

  if (markAllRead) {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ success: true, notification });
});

