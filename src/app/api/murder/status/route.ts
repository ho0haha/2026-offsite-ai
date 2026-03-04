import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { murderSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  MAX_MESSAGES_PER_CHARACTER,
  MAX_ACCUSATION_ATTEMPTS,
  MAX_SCENE_EXAMINATIONS,
  CHARACTER_IDS,
} from "@/lib/murder/constants";
import { CHARACTERS } from "@/lib/murder/characters";

export async function GET(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Find active session
  const session = await db
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

  if (!session) {
    return NextResponse.json({
      hasSession: false,
      message: "No active session. Call POST /api/murder/start to begin.",
    });
  }

  const messageCounts: Record<string, number> = JSON.parse(
    session.messageCounts || "{}"
  );
  const sceneExaminations: string[] = JSON.parse(
    session.sceneExaminations || "[]"
  );

  const messagesRemaining: Record<string, number> = {};
  for (const id of CHARACTER_IDS) {
    messagesRemaining[id] =
      MAX_MESSAGES_PER_CHARACTER - (messageCounts[id] || 0);
  }

  return NextResponse.json({
    hasSession: true,
    sessionId: session.id,
    messageCounts,
    messagesRemaining,
    totalMessages: session.totalMessages,
    maxTotalMessages: MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length,
    accusationAttempts: session.accusationAttempts || 0,
    maxAccusationAttempts: MAX_ACCUSATION_ATTEMPTS,
    sceneExaminations,
    sceneExaminationsRemaining:
      MAX_SCENE_EXAMINATIONS - sceneExaminations.length,
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
