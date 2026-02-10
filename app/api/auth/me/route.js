import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json({ user: auth.user });
}

