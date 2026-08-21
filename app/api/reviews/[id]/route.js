import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Review from "@/models/Review";
import { refreshProductRating } from "@/lib/reviews";

export const DELETE = withErrorHandling(async (request, { params }) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
  }

  await connectDB();
  const review = await Review.findById(id);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  await Review.findByIdAndDelete(id);
  await refreshProductRating(review.productId);
  return NextResponse.json({ success: true });
});


