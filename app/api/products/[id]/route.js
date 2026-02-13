import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Product from "@/models/Product";
import Review from "@/models/Review";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";
import Discount from "@/models/Discount";

export async function GET(_request, { params }) {
  await connectDB();
  const product = await Product.findById(params.id).lean();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const reviews = await Review.find({ productId: params.id })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const discounts = await Discount.find({
    active: true,
    $or: [
      { scopeType: "product", productId: params.id },
      { scopeType: "category", category: product.category }
    ]
  }).lean();
  const discount = getBestDiscountForProduct(product, discounts);
  const pricing = calculateDiscountedPrice(product.price, discount);

  return NextResponse.json({
    ...product,
    ...pricing,
    reviews
  });
}

export async function PATCH(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const body = await request.json();
  const product = await Product.findByIdAndUpdate(params.id, body, { new: true });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true, product });
}

export async function DELETE(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const deleted = await Product.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
