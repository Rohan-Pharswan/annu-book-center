import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { addressSchema, validate } from "@/lib/validators";
import User from "@/models/User";

const MAX_ADDRESSES = 10;

export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json({ user: auth.user });
});

export const PATCH = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await request.json();
  const update = {};

  // Validate name if provided
  if (body.name !== undefined) {
    const trimmed = String(body.name).trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 50) {
      return NextResponse.json({ error: "Name must be between 2 and 50 characters" }, { status: 400 });
    }
    update.name = trimmed;
  }

  // Validate addresses array if provided
  if (body.addresses !== undefined) {
    if (!Array.isArray(body.addresses)) {
      return NextResponse.json({ error: "addresses must be an array" }, { status: 400 });
    }
    if (body.addresses.length > MAX_ADDRESSES) {
      return NextResponse.json({ error: `Maximum ${MAX_ADDRESSES} addresses allowed` }, { status: 400 });
    }

    const addressesSchema = z.array(addressSchema);
    const parsed = addressesSchema.safeParse(body.addresses);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Invalid address data",
        details: parsed.error.issues.map((i) => i.message)
      }, { status: 400 });
    }
    update.addresses = parsed.data;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(auth.user._id, update, { new: true }).select("-password");
  return NextResponse.json({ success: true, user });
});



