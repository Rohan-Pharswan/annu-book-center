import { clearAuthCookie } from "@/lib/auth";
import { withErrorHandling } from "@/lib/apiHandler";

export const POST = withErrorHandling(async () => {
  return clearAuthCookie();
});


