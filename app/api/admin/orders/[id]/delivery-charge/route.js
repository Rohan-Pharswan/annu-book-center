import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Order from "@/models/Order";
import Notification from "@/models/Notification";

export const PATCH = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await request.json();
  const deliveryCharge = Number(body.deliveryCharge);
  if (!Number.isFinite(deliveryCharge) || deliveryCharge < 0) {
    return NextResponse.json({ error: "Please provide a valid delivery charge (₹0 or greater)" }, { status: 400 });
  }

  await connectDB();
  const order = await Order.findById(id).populate("userId", "name email");
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const formattedFee = Number(deliveryCharge.toFixed(2));
  const targetStatus = body.status && ["Pending", "Confirmed", "Ready for Pickup", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"].includes(body.status)
    ? body.status
    : order.status;

  // Idempotent check: if already confirmed with exact same charge and status, return immediately without duplicate writes
  if (
    order.deliveryChargeStatus === "confirmed" &&
    Number(order.deliveryCharge ?? 0) === formattedFee &&
    order.status === targetStatus
  ) {
    return NextResponse.json({ success: true, order, alreadyConfirmed: true });
  }

  // Calculate discounted items payable subtotal from order.items to guarantee 100% discount precision
  const discountedSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const updatedTotal = Number((discountedSubtotal + formattedFee).toFixed(2));

  order.deliveryCharge = formattedFee;
  order.deliveryChargeStatus = "confirmed";
  order.totalAmount = updatedTotal;

  if (body.status && ["Pending", "Confirmed", "Ready for Pickup", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"].includes(body.status)) {
    order.status = body.status;
  }

  await order.save();

  // Sync notification meta in background
  await Notification.updateMany(
    { "meta.orderId": order._id },
    {
      $set: {
        "meta.deliveryCharge": order.deliveryCharge,
        "meta.deliveryChargeStatus": "confirmed",
        "meta.totalAmount": order.totalAmount,
        "meta.orderStatus": order.status
      }
    }
  );

  return NextResponse.json({ success: true, order, alreadyConfirmed: false });
});
