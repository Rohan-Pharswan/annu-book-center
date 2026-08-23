import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { withErrorHandling } from "@/lib/apiHandler";

export const POST = withErrorHandling(async (request) => {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const body = await request.json().catch(() => ({}));
  const image = body?.image;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "A valid image string is required" }, { status: 400 });
  }

  try {
    const uploaded = await uploadImage(image);
    return NextResponse.json({
      success: true,
      imageUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      provider: uploaded.provider
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to upload image to storage" },
      { status: 500 }
    );
  }
});



