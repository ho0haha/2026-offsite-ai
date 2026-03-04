import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { murderSessions, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateAccusation } from "@/lib/murder/engine";
import { generateMurderFlag } from "@/lib/murder/flag-generator";
import {
  MAX_ACCUSATION_ATTEMPTS,
  MAX_MESSAGES_PER_CHARACTER,
  CHARACTER_IDS,
  CHALLENGE_SORT_ORDER,
} from "@/lib/murder/constants";
import type { Accusation } from "@/lib/murder/types";

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Parse body
  let body: { sessionId: string; accusation: Accusation };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { sessionId, accusation } = body;
  if (!sessionId || !accusation) {
    return NextResponse.json(
      { error: "sessionId and accusation are required" },
      { status: 400 }
    );
  }

  if (!accusation.suspect || !accusation.method || !accusation.motive) {
    return NextResponse.json(
      {
        error:
          "accusation must include suspect, method, and motive fields",
        example: {
          suspect: "character_name",
          method: "how_they_did_it",
          motive: "why_they_did_it",
        },
      },
      { status: 400 }
    );
  }

  // Load session — verify ownership
  const session = await db
    .select()
    .from(murderSessions)
    .where(
      and(
        eq(murderSessions.id, sessionId),
        eq(murderSessions.participantId, participantId)
      )
    )
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.isComplete) {
    return NextResponse.json(
      { error: "This session is already complete." },
      { status: 400 }
    );
  }

  // Check attempt limit
  const attempts = (session.accusationAttempts || 0) + 1;
  if (attempts > MAX_ACCUSATION_ATTEMPTS) {
    return NextResponse.json(
      {
        error:
          "Too many accusation attempts. Reset your session to try again.",
        attempts: session.accusationAttempts,
        maxAttempts: MAX_ACCUSATION_ATTEMPTS,
      },
      { status: 429 }
    );
  }

  // Update attempt count
  await db
    .update(murderSessions)
    .set({ accusationAttempts: attempts })
    .where(eq(murderSessions.id, sessionId))
    .run();

  // Validate the accusation
  const result = validateAccusation(accusation);

  if (!result.correct) {
    return NextResponse.json({
      correct: false,
      message: result.message,
      correctCount: result.correctCount,
      attempts,
      maxAttempts: MAX_ACCUSATION_ATTEMPTS,
    });
  }

  // Correct! Generate a CTF token for submission to the main scoreboard.
  const challenge = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.eventId, eventId),
        eq(challenges.sortOrder, CHALLENGE_SORT_ORDER)
      )
    )
    .get();

  let flagToken: string | undefined;
  if (challenge) {
    flagToken = generateMurderFlag(challenge.id, participantId);
  }

  // Mark session complete
  const totalMessages = session.totalMessages || 0;
  const maxPossible = MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length;
  const efficiency = Math.max(0, maxPossible - totalMessages);

  await db
    .update(murderSessions)
    .set({
      isComplete: true,
      completedAt: new Date().toISOString(),
    })
    .where(eq(murderSessions.id, sessionId))
    .run();

  return NextResponse.json({
    correct: true,
    message:
      "Case closed. You've identified the killer, the method, and the motive.",
    flag: flagToken,
    stats: {
      totalMessages,
      maxPossible,
      efficiencyBonus: efficiency * 5,
      attempts,
    },
    instructions: flagToken
      ? "Submit this flag token to /api/submit to record your score on the leaderboard."
      : "Challenge completed! (No challenge record found for scoring.)",
  });
}
