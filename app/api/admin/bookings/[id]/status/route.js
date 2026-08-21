import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Booking from "@/models/Booking";

const ALLOWED = ["Pending", "Approved", "Rejected", "Cancelled"];

export const PATCH = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  const { status } = await request.json();
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await connectDB();
  const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ success: true, booking });
});


