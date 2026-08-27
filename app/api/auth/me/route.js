import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";

export const GET = withErrorHandling(async (request) => {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    const res = NextResponse.json({ error: auth.message, user: null }, { status: auth.status });
    res.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
    return res;
  }
  return NextResponse.json({ user: auth.user });
});


