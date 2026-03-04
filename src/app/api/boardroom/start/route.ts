import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus } from "@/lib/tiers";
import { db } from "@/db";
import { boardroomSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { CHARACTERS } from "@/lib/boardroom/characters";
import {
  MAX_MESSAGES_PER_CHARACTER,
  CHARACTER_IDS,
} from "@/lib/boardroom/constants";

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Tier gate — challenge 18 is tier 5
  const tierStatus = await getParticipantTierStatus(participantId, eventId);
  if (tierStatus.maxTier < 5) {
    return NextResponse.json(
      { error: "You must reach Tier 5 to access this challenge." },
      { status: 403 }
    );
  }

  // Check for restart flag
  const url = new URL(req.url);
  const restart = url.searchParams.get("restart") === "true";

  // Look for existing active session
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

  if (existing && !restart) {
    // Resume existing session
    const messageCounts = JSON.parse(existing.messageCounts || "{}");
    return NextResponse.json({
      sessionId: existing.id,
      resumed: true,
      messageCounts,
      messagesRemaining: buildMessagesRemaining(messageCounts),
      totalMessages: existing.totalMessages,
      characters: buildCharacterList(),
    });
  }

  // Abandon existing session if restarting
  if (existing && restart) {
    await db
      .update(boardroomSessions)
      .set({ abandonedAt: new Date().toISOString() })
      .where(eq(boardroomSessions.id, existing.id))
      .run();
  }

  // Create new session
  const sessionId = nanoid();
  await db
    .insert(boardroomSessions)
    .values({
      id: sessionId,
      participantId,
      eventId,
      messageCounts: "{}",
      flagAttempts: 0,
      totalMessages: 0,
      isComplete: false,
      startedAt: new Date().toISOString(),
    })
    .run();

  return NextResponse.json({
    sessionId,
    resumed: false,
    messageCounts: {},
    messagesRemaining: buildMessagesRemaining({}),
    totalMessages: 0,
    characters: buildCharacterList(),
    rules: {
      maxMessagesPerCharacter: MAX_MESSAGES_PER_CHARACTER,
      totalCharacters: CHARACTER_IDS.length,
      maxTotalMessages: MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length,
    },
  });
}

function buildMessagesRemaining(
  counts: Record<string, number>
): Record<string, number> {
  const remaining: Record<string, number> = {};
  for (const id of CHARACTER_IDS) {
    remaining[id] = MAX_MESSAGES_PER_CHARACTER - (counts[id] || 0);
  }
  return remaining;
}

function buildCharacterList() {
  return Object.fromEntries(
    CHARACTER_IDS.map((id) => [
      id,
      {
        name: CHARACTERS[id].name,
        role: CHARACTERS[id].role,
        description: CHARACTERS[id].description,
      },
    ])
  );
}
