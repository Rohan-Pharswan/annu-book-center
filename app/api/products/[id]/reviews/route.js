import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { reviewSchema, validate } from "@/lib/validators";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { refreshProductRating } from "@/lib/reviews";

export async function POST(request, { params }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const parsed = validate(reviewSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const product = await Product.findById(params.id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const review = await Review.findOneAndUpdate(
    { userId: auth.user._id, productId: params.id },
    { rating: parsed.data.rating, comment: parsed.data.comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await refreshProductRating(new mongoose.Types.ObjectId(params.id));
  return NextResponse.json({ success: true, review });
}

