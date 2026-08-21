import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Review from "@/models/Review";

export const GET = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  await connectDB();
  const reviews = await Review.find().populate("userId", "name").populate("productId", "name").sort({ createdAt: -1 });
  return NextResponse.json({ reviews });
});


