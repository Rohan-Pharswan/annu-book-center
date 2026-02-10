import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, productSchema } from "@/lib/validators";
import { withErrorHandling } from "@/lib/apiHandler";
import Product from "@/models/Product";
import Discount from "@/models/Discount";
import { applyPercentage } from "@/lib/pricing";

export const GET = withErrorHandling(async (request) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 10), 50);
  const skip = (page - 1) * limit;

  const query = {};
  if (q) query.name = { $regex: q, $options: "i" };
  if (category) query.category = category;

  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query)
  ]);

  const discounts = await Discount.find({ active: true }).lean();
  const data = items.map((item) => {
    const productDiscount = discounts.find(
      (d) =>
        (d.scopeType === "product" && String(d.productId) === String(item._id)) ||
        (d.scopeType === "category" && d.category === item.category)
    );
    const discountPercentage = productDiscount?.percentage || 0;
    return {
      ...item,
      discountPercentage,
      finalPrice: applyPercentage(item.price, discountPercentage)
    };
  });

  return NextResponse.json({
    items: data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

export const POST = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const body = await request.json();
  if (body.image && !body.images) {
    body.images = [body.image];
    delete body.image;
  }
  const parsed = validate(productSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const product = await Product.create(parsed.data);
  return NextResponse.json({ success: true, product }, { status: 201 });
});
