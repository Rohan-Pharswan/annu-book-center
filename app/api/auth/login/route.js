import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { withAuthCookie } from "@/lib/auth";
import { loginSchema, validate } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";
import { withErrorHandling } from "@/lib/apiHandler";
import User from "@/models/User";

export const POST = withErrorHandling(async (request) => {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rate = checkRateLimit(`login:${ip}`, 10, 60_000);
  if (!rate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json();
  const parsed = validate(loginSchema, body);
  if (!parsed.ok) return NextResponse.json({ errors: parsed.errors }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(parsed.data.password, user.password);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = signToken({ userId: user._id, role: user.role });
  const response = NextResponse.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
  return withAuthCookie(response, token);
});
