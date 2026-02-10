import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Booking from "@/models/Booking";

const ALLOWED = ["Pending", "Approved", "Rejected", "Cancelled"];

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { status } = await request.json();
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await connectDB();
  const booking = await Booking.findByIdAndUpdate(params.id, { status }, { new: true });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ success: true, booking });
}

