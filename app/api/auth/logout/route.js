import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  return clearAuthCookie();
}

