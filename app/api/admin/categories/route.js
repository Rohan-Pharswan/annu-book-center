import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import Category from "@/models/Category";

export const GET = withErrorHandling(async () => {
  await connectDB();
  const categories = await Category.find().sort({ name: 1 });
  return NextResponse.json({ categories });
});

export const POST = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const body = await request.json();
  if (!body.name || !String(body.name).trim()) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  await connectDB();
  const category = await Category.create({
    name: String(body.name).trim(),
    description: String(body.description || "").trim()
  });
  return NextResponse.json({ success: true, category }, { status: 201 });
});

export const DELETE = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  await connectDB();
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
});


