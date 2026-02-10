import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { withAuthCookie } from "@/lib/auth";
import { signupSchema, validate } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";

export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rate = checkRateLimit(`signup:${ip}`, 8, 60_000);
  if (!rate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json();
  const parsed = validate(signupSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const exists = await User.findOne({ email: parsed.data.email });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password: hash
  });

  const token = signToken({ userId: user._id, role: user.role });
  const response = NextResponse.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
  return withAuthCookie(response, token);
});
