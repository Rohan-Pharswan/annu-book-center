import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Review from "@/models/Review";
import { refreshProductRating } from "@/lib/reviews";

export async function DELETE(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const review = await Review.findById(params.id);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  await Review.findByIdAndDelete(params.id);
  await refreshProductRating(review.productId);
  return NextResponse.json({ success: true });
}

