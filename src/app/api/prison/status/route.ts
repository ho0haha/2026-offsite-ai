import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem } from "@/lib/auth";
import { db } from "@/db";
import { gameSessions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { deserializeState } from "@/lib/prison/state";
import { MAX_TURNS } from "@/lib/prison/constants";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Modem gate — route is invisible until modem is activated
  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  // Find the most recent active or completed session
  const session = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.participantId, participantId),
        eq(gameSessions.eventId, eventId),
        isNull(gameSessions.abandonedAt)
      )
    )
    .get();

  if (!session) {
    return NextResponse.json({
      hasSession: false,
      message: "No active game session. Call POST /api/prison/start to begin.",
    });
  }

  const state = deserializeState(session.state);

  return NextResponse.json({
    hasSession: true,
    sessionId: session.id,
    turnsRemaining: MAX_TURNS - state.turnNumber,
    turnNumber: state.turnNumber,
    gameOver: session.isComplete,
    escaped: session.escaped,
    startedAt: session.startedAt,
    currentRoom: state.currentRoom,
  });
}
