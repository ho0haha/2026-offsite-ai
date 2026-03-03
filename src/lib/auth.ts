import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/crypto";

/**
 * Require a valid session token from the Authorization header.
 * Returns the session data or a 401 response.
 */
export function requireAuth(
  req: NextRequest
): { participantId: string; eventId: string } | NextResponse {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired session token" },
      { status: 401 }
    );
  }

  return session;
}
