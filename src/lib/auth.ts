import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/crypto";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Returns a 404 if the participant has not activated the modem.
 * This makes prison routes invisible to AI probing.
 */
export async function requireModem(
  participantId: string
): Promise<NextResponse | null> {
  const participant = await db
    .select({ modemActivated: participants.modemActivated, diskWiped: participants.diskWiped })
    .from(participants)
    .where(eq(participants.id, participantId))
    .get();

  if (!participant?.modemActivated || participant?.diskWiped) {
    return NextResponse.json({}, { status: 404 });
  }

  return null;
}
