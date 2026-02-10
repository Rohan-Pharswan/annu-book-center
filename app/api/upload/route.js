import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { image } = await request.json();
  if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });

  const uploaded = await uploadImage(image);
  return NextResponse.json({ success: true, imageUrl: uploaded.secureUrl, provider: uploaded.provider });
}

