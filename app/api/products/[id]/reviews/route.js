import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { reviewSchema, validate } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/apiHandler";
import Review from "@/models/Review";
import Product from "@/models/Product";
import { refreshProductRating } from "@/lib/reviews";

export const POST = withErrorHandling(async (request, { params }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  // Rate limit: max 5 review submissions per user per 5 minutes
  const userId = String(auth.user._id);
  const rate = checkRateLimit(`review:${userId}`, 5, 5 * 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many review submissions. Please wait a few minutes." },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = validate(reviewSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const targetProductId = new mongoose.Types.ObjectId(id);
  const review = await Review.findOneAndUpdate(
    { userId: auth.user._id, productId: targetProductId },
    { rating: parsed.data.rating, comment: parsed.data.comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await refreshProductRating(targetProductId);
  return NextResponse.json({ success: true, review });
});


