import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validate, productSchema } from "@/lib/validators";
import { withErrorHandling } from "@/lib/apiHandler";
import Product from "@/models/Product";
import Discount from "@/models/Discount";
import { calculateDiscountedPrice, getBestDiscountForProduct } from "@/lib/pricing";
import { uploadImage } from "@/lib/cloudinary";
import mongoose from "mongoose";

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

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = withErrorHandling(async (request) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  const category = searchParams.get("category") || "";
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 10), 50);
  const skip = (page - 1) * limit;

  const query = {};
  if (q) {
    const qRegex = { $regex: escapeRegex(q), $options: "i" };
    const or = [{ name: qRegex }, { category: qRegex }];
    if (mongoose.Types.ObjectId.isValid(q)) {
      or.push({ _id: new mongoose.Types.ObjectId(q) });
    }
    query.$or = or;
  }
  if (category) query.category = category;

  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(query)
  ]);

  const discounts = await Discount.find({ active: true }).lean();
  const data = items.map((item) => {
    const productDiscount = getBestDiscountForProduct(item, discounts);
    const pricing = calculateDiscountedPrice(item.price, productDiscount);
    return {
      ...item,
      ...pricing
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
  const imageFromBody = normalizeImageUrl(body.image);
  const rawImages = Array.isArray(body.images) ? body.images.map((img) => normalizeImageUrl(img)).filter(Boolean) : [];

  const initialImages = rawImages.length > 0 ? rawImages : imageFromBody ? [imageFromBody] : [];

  if (initialImages.length === 0) {
    return NextResponse.json({ errors: ["At least one product image is required"] }, { status: 400 });
  }

  delete body.image;

  // Process any Base64 images through Cloudinary before persisting
  const processedImages = [];
  for (const img of initialImages) {
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

  body.images = processedImages;

  const parsed = validate(productSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const product = await Product.create(parsed.data);
  return NextResponse.json({ success: true, product }, { status: 201 });
});

