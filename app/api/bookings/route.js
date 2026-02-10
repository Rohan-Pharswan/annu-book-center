import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { bookingSchema, validate } from "@/lib/validators";
import Booking from "@/models/Booking";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  await connectDB();

  const query = auth.user.role === "admin" ? {} : { userId: auth.user._id };
  const bookings = await Booking.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ bookings });
}

export async function POST(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const body = await request.json();
  const parsed = validate(bookingSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const booking = await Booking.create({
    userId: auth.user._id,
    date: parsed.data.date,
    time: parsed.data.time,
    status: "Pending"
  });
  return NextResponse.json({ success: true, booking }, { status: 201 });
}

