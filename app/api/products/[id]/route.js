import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, productSchema } from "@/lib/validators";
import { withErrorHandling } from "@/lib/apiHandler";
import Product from "@/models/Product";
import Review from "@/models/Review";
import User from "@/models/User";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";

import Discount from "@/models/Discount";
import { uploadImage } from "@/lib/cloudinary";

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

export const GET = withErrorHandling(async (_request, { params }) => {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();
  const product = await Product.findById(id).lean();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const reviews = await Review.find({ productId: id })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const discounts = await Discount.find({
    active: true,
    $or: [
      { scopeType: "product", productId: id },
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
});

export const PATCH = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();
  const current = await Product.findById(id).lean();
  if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await request.json();
  const imageFromBody = normalizeImageUrl(body.image);
  const rawImages = Array.isArray(body.images)
    ? body.images.map((img) => normalizeImageUrl(img)).filter(Boolean)
    : null;

  const merged = {
    ...current,
    ...body
  };

  let targetImages = null;
  if (rawImages) {
    targetImages = rawImages;
  } else if (imageFromBody) {
    targetImages = [imageFromBody];
  }

  if (targetImages) {
    const processedImages = [];
    for (const img of targetImages) {
      if (img.startsWith("data:image/")) {
        try {
          const uploaded = await uploadImage(img);
          processedImages.push(uploaded.secureUrl);
        } catch (err) {
          return NextResponse.json(
            { error: `Failed to upload image to Cloudinary: ${err.message}` },
            { status: 400 }
          );
        }
      } else {
        processedImages.push(img);
      }
    }
    merged.images = processedImages;
  }

  delete merged._id;
  delete merged.__v;
  delete merged.createdAt;
  delete merged.updatedAt;
  delete merged.image;

  const parsed = validate(productSchema, merged);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  const product = await Product.findByIdAndUpdate(id, parsed.data, { new: true });
  return NextResponse.json({ success: true, product });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true });
});

