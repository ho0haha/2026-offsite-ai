import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { murderSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Find active session
  const existing = await db
    .select()
    .from(murderSessions)
    .where(
      and(
        eq(murderSessions.participantId, participantId),
        eq(murderSessions.eventId, eventId),
        eq(murderSessions.isComplete, false),
        isNull(murderSessions.abandonedAt)
      )
    )
    .get();

  if (!existing) {
    return NextResponse.json({
      message: "No active session to reset.",
    });
  }

  // Mark as abandoned
  await db
    .update(murderSessions)
    .set({ abandonedAt: new Date().toISOString() })
    .where(eq(murderSessions.id, existing.id))
    .run();

  return NextResponse.json({
    message:
      "Session reset. All conversations and evidence cleared. Call /api/murder/start to begin a new investigation.",
    previousSessionId: existing.id,
    previousTotalMessages: existing.totalMessages,
    previousAccusationAttempts: existing.accusationAttempts,
  });
}
