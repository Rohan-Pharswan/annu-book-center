import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Order from "@/models/Order";

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

  // Calculate discounted items payable subtotal from order.items to guarantee 100% discount precision
  const discountedSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const updatedTotal = Number((discountedSubtotal + deliveryCharge).toFixed(2));

  order.deliveryCharge = Number(deliveryCharge.toFixed(2));
  order.deliveryChargeStatus = "confirmed";
  order.totalAmount = updatedTotal;

  if (body.status && ["Pending", "Confirmed", "Ready for Pickup", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"].includes(body.status)) {
    order.status = body.status;
  }

  await order.save();

  return NextResponse.json({ success: true, order });
});
