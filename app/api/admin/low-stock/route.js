import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Product from "@/models/Product";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  await connectDB();

  const threshold = 5;
  const products = await Product.find({ stock: { $lte: threshold } }).sort({ stock: 1 });
  return NextResponse.json({ threshold, products });
}

