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
  const discountType = body.discountType === "flat" ? "flat" : "percentage";
  const numericValue =
    discountType === "flat" ? Number(body.value) : Number(body.percentage ?? body.value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
  }

  if (discountType === "percentage" && numericValue > 90) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 90" }, { status: 400 });
  }

  const payload = {
    ...body,
    category: typeof body.category === "string" ? body.category.trim() : body.category,
    discountType,
    percentage: discountType === "percentage" ? numericValue : undefined,
    value: discountType === "flat" ? numericValue : undefined
  };

  await connectDB();
  const discount = await Discount.create(payload);
  return NextResponse.json({ success: true, discount }, { status: 201 });
}

export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { id, ...update } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await connectDB();
  const payload = { ...update };
  if (payload.discountType === "percentage" && payload.percentage != null) {
    payload.percentage = Number(payload.percentage);
  }
  if (payload.discountType === "flat" && payload.value != null) {
    payload.value = Number(payload.value);
  }

  const discount = await Discount.findByIdAndUpdate(id, payload, { new: true });
  if (!discount) return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  return NextResponse.json({ success: true, discount });
}
