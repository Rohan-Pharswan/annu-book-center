import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Discount from "@/models/Discount";

export async function GET() {
  await connectDB();
  const discounts = await Discount.find().sort({ createdAt: -1 });
  return NextResponse.json({ discounts });
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const body = await request.json();

  await connectDB();
  const discount = await Discount.create(body);
  return NextResponse.json({ success: true, discount }, { status: 201 });
}

export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { id, ...update } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await connectDB();
  const discount = await Discount.findByIdAndUpdate(id, update, { new: true });
  if (!discount) return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  return NextResponse.json({ success: true, discount });
}

