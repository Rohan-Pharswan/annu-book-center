import { NextResponse } from "next/server";

export function withErrorHandling(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

