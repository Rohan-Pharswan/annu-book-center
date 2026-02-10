import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const TOKEN_NAME = "token";

export function getTokenFromRequest(request) {
  return request.cookies.get(TOKEN_NAME)?.value || "";
}

export async function requireAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) return { ok: false, status: 401, message: "Unauthorized" };

  try {
    const decoded = verifyToken(token);
    await connectDB();
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return { ok: false, status: 401, message: "Invalid session" };
    return { ok: true, user };
  } catch {
    return { ok: false, status: 401, message: "Invalid token" };
  }
}

export async function requireAdmin(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return { ok: false, status: 403, message: "Admin access required" };
  }
  return auth;
}

export function withAuthCookie(response, token) {
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}

export function clearAuthCookie() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}

