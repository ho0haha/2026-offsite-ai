import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth, requireModem, requireTier7 } from "@/lib/auth";
import { db } from "@/db";
import { gameSessions, challenges } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  createInitialState,
  serializeState,
  deserializeState,
} from "@/lib/prison/state";
import { getOpeningNarrative } from "@/lib/prison/responses";
import { MAX_TURNS, CHALLENGE_ID_SORT_ORDER } from "@/lib/prison/constants";
import { verifyInteractionToken } from "@/lib/interaction-token";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Tier 7 gate
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  // Modem gate — route is invisible until modem is activated
  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  // Parse body for bootToken (optional)
  let bootToken: string | undefined;
  try {
    const body = await req.json();
    bootToken = body?.bootToken;
  } catch {
    // No body or invalid JSON — that's fine for backward compat
  }

  // Check for restart flag
  const url = new URL(req.url);
  const restart = url.searchParams.get("restart") === "true";

  // Look for existing active session
  const existing = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.participantId, participantId),
        eq(gameSessions.eventId, eventId),
        eq(gameSessions.isComplete, false),
        isNull(gameSessions.abandonedAt)
      )
    )
    .get();

  if (existing && !restart) {
    // Resume existing session
    const state = deserializeState(existing.state);
    return NextResponse.json({
      sessionId: existing.id,
      output: `[Session resumed — Turn ${state.turnNumber}/${MAX_TURNS}]\n\nType LOOK to observe your surroundings.`,
      turnsRemaining: MAX_TURNS - state.turnNumber,
      resumed: true,
    });
  }

  // Abandon existing session if restarting
  if (existing && restart) {
    await db
      .update(gameSessions)
      .set({ abandonedAt: new Date().toISOString() })
      .where(eq(gameSessions.id, existing.id))
      .run();
  }

  // Require boot token for new game creation
  if (!bootToken) {
    console.warn(
      `[prison/start] New game requested without bootToken for participant ${participantId}`
    );
    return NextResponse.json(
      {
        error:
          "Missing bootToken. You must boot the monitor in-browser before starting a new game.",
      },
      { status: 403 }
    );
  }

  const bootPayload = verifyInteractionToken(
    bootToken,
    "boot",
    participantId
  );
  if (!bootPayload) {
    console.warn(
      `[prison/start] Invalid/expired bootToken for participant ${participantId}`
    );
    return NextResponse.json(
      { error: "Invalid or expired boot token." },
      { status: 403 }
    );
  }

  // Create new session
  const sessionId = nanoid();
  const state = createInitialState(sessionId, participantId, eventId);

  await db
    .insert(gameSessions)
    .values({
      id: sessionId,
      participantId,
      eventId,
      state: serializeState(state),
      turnCount: 0,
      startedAt: new Date().toISOString(),
      lastCommandAt: null,
      isComplete: false,
      escaped: false,
      abandonedAt: null,
    })
    .run();

  return NextResponse.json({
    sessionId,
    output: getOpeningNarrative(),
    turnsRemaining: MAX_TURNS,
    resumed: false,
  });
}
