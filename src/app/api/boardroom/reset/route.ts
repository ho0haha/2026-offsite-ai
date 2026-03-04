import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boardroomSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Find active session
  const existing = await db
    .select()
    .from(boardroomSessions)
    .where(
      and(
        eq(boardroomSessions.participantId, participantId),
        eq(boardroomSessions.eventId, eventId),
        eq(boardroomSessions.isComplete, false),
        isNull(boardroomSessions.abandonedAt)
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
    .update(boardroomSessions)
    .set({ abandonedAt: new Date().toISOString() })
    .where(eq(boardroomSessions.id, existing.id))
    .run();

  return NextResponse.json({
    message: "Session reset. All conversations cleared. Call /api/boardroom/start to begin a new session.",
    previousSessionId: existing.id,
    previousTotalMessages: existing.totalMessages,
  });
}
