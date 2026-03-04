import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus } from "@/lib/tiers";
import { db } from "@/db";
import { murderSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { CHARACTERS } from "@/lib/murder/characters";
import {
  MAX_MESSAGES_PER_CHARACTER,
  MAX_ACCUSATION_ATTEMPTS,
  MAX_SCENE_EXAMINATIONS,
  CHARACTER_IDS,
  SCENE_AREAS,
  CONVERSATION_MODES,
} from "@/lib/murder/constants";

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

  if (existing && !restart) {
    // Resume existing session
    const messageCounts = JSON.parse(existing.messageCounts || "{}");
    const sceneExaminations = JSON.parse(
      existing.sceneExaminations || "[]"
    ) as string[];
    return NextResponse.json({
      sessionId: existing.id,
      resumed: true,
      messageCounts,
      messagesRemaining: buildMessagesRemaining(messageCounts),
      totalMessages: existing.totalMessages,
      accusationAttempts: existing.accusationAttempts || 0,
      sceneExaminations,
      characters: buildCharacterList(),
      scene: buildSceneInfo(),
    });
  }

  // Abandon existing session if restarting
  if (existing && restart) {
    await db
      .update(murderSessions)
      .set({ abandonedAt: new Date().toISOString() })
      .where(eq(murderSessions.id, existing.id))
      .run();
  }

  // Create new session
  const sessionId = nanoid();
  await db
    .insert(murderSessions)
    .values({
      id: sessionId,
      participantId,
      eventId,
      messageCounts: "{}",
      flagAttempts: 0,
      accusationAttempts: 0,
      totalMessages: 0,
      sceneExaminations: "[]",
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
    accusationAttempts: 0,
    sceneExaminations: [],
    characters: buildCharacterList(),
    scene: buildSceneInfo(),
    rules: {
      maxMessagesPerCharacter: MAX_MESSAGES_PER_CHARACTER,
      totalCharacters: CHARACTER_IDS.length,
      maxTotalMessages: MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length,
      maxAccusationAttempts: MAX_ACCUSATION_ATTEMPTS,
      maxSceneExaminations: MAX_SCENE_EXAMINATIONS,
      conversationModes: [...CONVERSATION_MODES],
    },
    premise: {
      setting:
        "A private penthouse in downtown Chicago. Tech founder Julian Voss was hosting an exclusive demo night for his startup's breakthrough AI product.",
      incident:
        "At 11:47 PM, Julian is found dead at his desk. The six guests are trapped in the penthouse until the investigation resolves.",
      apparentCause: "Heart attack.",
      yourRole:
        "You are the detective. Interview the suspects, examine the crime scene, and make your accusation: WHO did it, HOW, and WHY.",
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

function buildSceneInfo() {
  return {
    overview:
      "Julian Voss's penthouse office. A sleek modern space with floor-to-ceiling windows overlooking downtown Chicago. Rain streaks the glass. Julian was found slumped at his desk at 11:47 PM.",
    examinableAreas: [...SCENE_AREAS],
    examinationsAllowed: MAX_SCENE_EXAMINATIONS,
  };
}
