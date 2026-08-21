import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";
import { addressSchema } from "@/lib/validators";
import User from "@/models/User";

export const PUT = withErrorHandling(async (request, { params }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Invalid address data",
      details: parsed.error.issues.map((i) => i.message)
    }, { status: 400 });
  }

  await connectDB();
  // Use positional operator to update only this address subdocument.
  // The userId is always from the auth token — not from request — preventing IDOR.
  const user = await User.findOneAndUpdate(
    { _id: auth.user._id, "addresses._id": new mongoose.Types.ObjectId(id) },
    {
      $set: {
        "addresses.$.label": parsed.data.label,
        "addresses.$.line1": parsed.data.line1,
        "addresses.$.city": parsed.data.city,
        "addresses.$.state": parsed.data.state,
        "addresses.$.postalCode": parsed.data.postalCode,
        "addresses.$.phone": parsed.data.phone
      }
    },
    { new: true }
  ).select("-password");

  if (!user) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  return NextResponse.json({ success: true, user });
});

export const DELETE = withErrorHandling(async (request, { params }) => {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  await connectDB();
  // $pull removes the matching subdocument from the addresses array.
  // userId is always from auth token — IDOR-safe.
  const user = await User.findOneAndUpdate(
    { _id: auth.user._id },
    { $pull: { addresses: { _id: new mongoose.Types.ObjectId(id) } } },
    { new: true }
  ).select("-password");

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, user });
});
