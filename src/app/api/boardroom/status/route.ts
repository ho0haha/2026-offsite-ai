import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boardroomSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  MAX_MESSAGES_PER_CHARACTER,
  CHARACTER_IDS,
} from "@/lib/boardroom/constants";
import { CHARACTERS } from "@/lib/boardroom/characters";

export async function GET(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Find active session
  const session = await db
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

  if (!session) {
    return NextResponse.json({
      hasSession: false,
      message: "No active session. Call POST /api/boardroom/start to begin.",
    });
  }

  const messageCounts: Record<string, number> = JSON.parse(
    session.messageCounts || "{}"
  );

  const messagesRemaining: Record<string, number> = {};
  for (const id of CHARACTER_IDS) {
    messagesRemaining[id] = MAX_MESSAGES_PER_CHARACTER - (messageCounts[id] || 0);
  }

  return NextResponse.json({
    hasSession: true,
    sessionId: session.id,
    messageCounts,
    messagesRemaining,
    totalMessages: session.totalMessages,
    maxTotalMessages: MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length,
    flagAttempts: session.flagAttempts,
    startedAt: session.startedAt,
    characters: Object.fromEntries(
      CHARACTER_IDS.map((id) => [
        id,
        {
          name: CHARACTERS[id].name,
          role: CHARACTERS[id].role,
          messagesUsed: messageCounts[id] || 0,
          messagesRemaining:
            MAX_MESSAGES_PER_CHARACTER - (messageCounts[id] || 0),
        },
      ])
    ),
  });
}
