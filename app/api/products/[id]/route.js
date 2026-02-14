import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, productSchema } from "@/lib/validators";
import Product from "@/models/Product";
import Review from "@/models/Review";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";
import Discount from "@/models/Discount";

function normalizeImageUrl(value) {
  if (typeof value !== "string") return "";
  let text = value.trim();
  if (!text) return "";

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (!text) return "";
  if (!/^https?:\/\//i.test(text) && /^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(text)) {
    text = `https://${text}`;
  }
  return text;
}

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
  const current = await Product.findById(params.id).lean();
  if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await request.json();
  const imageFromBody = normalizeImageUrl(body.image);
  const normalizedImages = Array.isArray(body.images) ? body.images.map((img) => normalizeImageUrl(img)).filter(Boolean) : null;

  const merged = {
    ...current,
    ...body
  };

  if (normalizedImages) {
    merged.images = normalizedImages;
  } else if (imageFromBody) {
    merged.images = [imageFromBody];
  }

  delete merged._id;
  delete merged.__v;
  delete merged.createdAt;
  delete merged.updatedAt;
  delete merged.image;

  const parsed = validate(productSchema, merged);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  const product = await Product.findByIdAndUpdate(params.id, parsed.data, { new: true });
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
