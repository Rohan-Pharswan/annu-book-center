import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withErrorHandling } from "@/lib/apiHandler";
import Category from "@/models/Category";

export const GET = withErrorHandling(async () => {
  await connectDB();
  const categories = await Category.find().sort({ name: 1 }).lean();
  return NextResponse.json({ categories });
});
