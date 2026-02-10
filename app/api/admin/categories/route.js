import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Category from "@/models/Category";

export async function GET() {
  await connectDB();
  const categories = await Category.find().sort({ name: 1 });
  return NextResponse.json({ categories });
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  await connectDB();
  const category = await Category.create({ name: body.name, description: body.description || "" });
  return NextResponse.json({ success: true, category }, { status: 201 });
}

export async function DELETE(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await connectDB();
  await Category.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

