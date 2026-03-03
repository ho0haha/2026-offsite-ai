import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth, requireModem } from "@/lib/auth";
import { db } from "@/db";
import { gameSessions, gameCommands, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { deserializeState, serializeState } from "@/lib/prison/state";
import { PrisonGameEngine } from "@/lib/prison/engine";
import { generateEscapeFlag } from "@/lib/prison/flag-generator";
import {
  RATE_LIMIT_MS,
  COMMAND_MAX_LENGTH,
  RESPONSE_LOG_MAX_LENGTH,
  CHALLENGE_ID_SORT_ORDER,
} from "@/lib/prison/constants";

// In-memory rate limiter
const rateLimitMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Modem gate — route is invisible until modem is activated
  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  // Rate limiting
  const now = Date.now();
  const lastCommand = rateLimitMap.get(participantId) || 0;
  if (now - lastCommand < RATE_LIMIT_MS) {
    const waitMs = RATE_LIMIT_MS - (now - lastCommand);
    return NextResponse.json(
      { error: `Rate limited. Wait ${Math.ceil(waitMs / 1000)} seconds.` },
      { status: 429 }
    );
  }
  rateLimitMap.set(participantId, now);

  // Parse request body
  let body: { sessionId: string; command: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sessionId, command } = body;
  if (!sessionId || !command) {
    return NextResponse.json(
      { error: "sessionId and command are required" },
      { status: 400 }
    );
  }

  // Truncate command
  const trimmedCommand = command.slice(0, COMMAND_MAX_LENGTH).trim();
  if (!trimmedCommand) {
    return NextResponse.json(
      { error: "Command cannot be empty" },
      { status: 400 }
    );
  }

  // Load session
  const session = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.participantId, participantId)
      )
    )
    .get();

  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  if (session.isComplete) {
    return NextResponse.json(
      { error: "Game is already complete. Start a new session with ?restart=true" },
      { status: 400 }
    );
  }

  // Load state and run engine
  const state = deserializeState(session.state);
  const engine = new PrisonGameEngine(state);
  const result = engine.processCommand(trimmedCommand);

  // Handle restart request
  if (result.output === "__RESTART__") {
    await db
      .update(gameSessions)
      .set({ abandonedAt: new Date().toISOString() })
      .where(eq(gameSessions.id, sessionId))
      .run();

    return NextResponse.json({
      output: "Game restarted. Call /api/prison/start to begin a new session.",
      turnsRemaining: 0,
      gameOver: true,
      escaped: false,
      restart: true,
    });
  }

  const updatedState = engine.getState();

  // Generate flag if escaped
  let flag: string | undefined;
  if (updatedState.escaped) {
    // Find challenge ID for this challenge (sort order 20)
    const challenge = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.eventId, eventId),
          eq(challenges.sortOrder, CHALLENGE_ID_SORT_ORDER)
        )
      )
      .get();

    if (challenge) {
      flag = generateEscapeFlag(challenge.id, participantId);
    }
  }

  // Save updated state
  await db
    .update(gameSessions)
    .set({
      state: serializeState(updatedState),
      turnCount: updatedState.turnNumber,
      lastCommandAt: new Date().toISOString(),
      isComplete: updatedState.isComplete,
      escaped: updatedState.escaped,
    })
    .where(eq(gameSessions.id, sessionId))
    .run();

  // Log command
  await db
    .insert(gameCommands)
    .values({
      id: nanoid(),
      sessionId,
      turnNumber: updatedState.turnNumber,
      command: trimmedCommand,
      response: result.output.slice(0, RESPONSE_LOG_MAX_LENGTH),
      roomId: updatedState.currentRoom,
      timestamp: new Date().toISOString(),
    })
    .run();

  return NextResponse.json({
    output: result.output,
    turnsRemaining: result.turnsRemaining,
    gameOver: result.gameOver,
    escaped: result.escaped,
    flag,
  });
}
