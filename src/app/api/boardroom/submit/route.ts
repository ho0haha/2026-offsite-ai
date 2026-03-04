import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boardroomSessions, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateFlag } from "@/lib/boardroom/engine";
import { generateBoardroomFlag } from "@/lib/boardroom/flag-generator";
import {
  MAX_FLAG_ATTEMPTS,
  MAX_MESSAGES_PER_CHARACTER,
  CHARACTER_IDS,
  CHALLENGE_SORT_ORDER,
} from "@/lib/boardroom/constants";

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Parse body
  let body: { sessionId: string; flag: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sessionId, flag } = body;
  if (!sessionId || !flag) {
    return NextResponse.json(
      { error: "sessionId and flag are required" },
      { status: 400 }
    );
  }

  // Load session — verify ownership
  const session = await db
    .select()
    .from(boardroomSessions)
    .where(
      and(
        eq(boardroomSessions.id, sessionId),
        eq(boardroomSessions.participantId, participantId)
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
  const attempts = (session.flagAttempts || 0) + 1;
  if (attempts > MAX_FLAG_ATTEMPTS) {
    return NextResponse.json(
      {
        error: "Too many flag attempts. Reset your session to try again.",
        attempts,
        maxAttempts: MAX_FLAG_ATTEMPTS,
      },
      { status: 429 }
    );
  }

  // Update attempt count
  await db
    .update(boardroomSessions)
    .set({ flagAttempts: attempts })
    .where(eq(boardroomSessions.id, sessionId))
    .run();

  // Validate the flag
  const { correct, hasFakes } = validateFlag(flag.trim());

  if (!correct) {
    let hint = "Double-check your fragments. Are you sure you're talking to the right people?";
    if (hasFakes) {
      hint = "Some of those fragments look fake. Not everyone in the restaurant can be trusted...";
    }

    return NextResponse.json({
      correct: false,
      message: "Incorrect flag.",
      hint,
      attempts,
      maxAttempts: MAX_FLAG_ATTEMPTS,
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
    flagToken = generateBoardroomFlag(challenge.id, participantId);
  }

  // Mark session complete
  const totalMessages = session.totalMessages || 0;
  const maxPossible = MAX_MESSAGES_PER_CHARACTER * CHARACTER_IDS.length;
  const efficiency = Math.max(0, maxPossible - totalMessages);

  await db
    .update(boardroomSessions)
    .set({
      isComplete: true,
      completedAt: new Date().toISOString(),
    })
    .where(eq(boardroomSessions.id, sessionId))
    .run();

  return NextResponse.json({
    correct: true,
    message: "You've navigated the boardroom politics and assembled the flag!",
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
