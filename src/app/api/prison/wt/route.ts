import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem, requireTier7 } from "@/lib/auth";
import {
  talkToWopr,
  startJoshuaSession,
  sanitizeWoprInput,
} from "@/lib/prison/wopr";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// In-memory rate limiter: 2000ms between messages
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000;

const GAME_LIST = [
  "  FALKEN'S MAZE",
  "  BLACK JACK",
  "  GIN RUMMY",
  "  HEARTS",
  "  BRIDGE",
  "  CHECKERS",
  "  CHESS",
  "  POKER",
  "  FIGHTER COMBAT",
  "  GUERRILLA ENGAGEMENT",
  "  DESERT WARFARE",
  "  AIR-TO-GROUND ACTIONS",
  "  THEATERWIDE TACTICAL WARFARE",
  "  THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE",
  "",
  "  GLOBAL THERMONUCLEAR WAR",
];

const MISSILE_ART = [
  "              |",
  "             /|\\",
  "            / | \\",
  "           /  |  \\",
  "          /   |   \\",
  "         /    |    \\",
  "        /_____|_____\\",
  "            | |",
  "            | |",
  "           /| |\\",
  "          / | | \\",
  "         /  | |  \\",
  "            |_|",
  "           /   \\",
  "          / * * \\",
  "         / * * * \\",
  "        /_________\\",
];

const EXPLOSION_ART = [
  "            . * .  . * .",
  "        * .   *   .   . *",
  "      .  *  . * .  *  .  *",
  "    * . *  *       *  * . *",
  "   .  *      * * *      *  .",
  "  * .    *    ***    *    . *",
  "  . *  *   **#####**   *  * .",
  " *  .   **###########**   .  *",
  "  . * **#####*****#####** * .",
  "  *  *###***       ***###*  *",
  "   .  *##*    ***    *##*  .",
  "    * . *   *#####*   * . *",
  "      .  *  *###*  *  .",
  "        * .  *#*  . *",
  "            . * .",
];

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Tier 7 gate
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  // Modem gate
  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  // Rate limiting
  const now = Date.now();
  const lastMsg = rateLimitMap.get(participantId) || 0;
  if (now - lastMsg < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Rate limited." },
      { status: 429 }
    );
  }
  rateLimitMap.set(participantId, now);

  // Parse body
  let body: { message?: string; reset?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Handle session launch — initializes the session gate
  if (body.reset) {
    startJoshuaSession(participantId);
    return NextResponse.json({ ok: true, greeting: "GREETINGS PROFESSOR FALKEN." });
  }

  // Validate message
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const sanitized = sanitizeWoprInput(body.message);
  if (!sanitized) {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 }
    );
  }

  const result = await talkToWopr(
    participantId,
    sanitized
  );

  // null = no active session — return 404 to stay invisible
  if (!result) {
    return NextResponse.json({}, { status: 404 });
  }

  // Track disconnects and trigger dead man's switch
  if (result.action === "dc") {
    await db
      .update(participants)
      .set({ woprDisconnects: sql`coalesce(${participants.woprDisconnects}, 0) + 1` })
      .where(eq(participants.id, participantId))
      .run();

    const updated = await db
      .select({ woprDisconnects: participants.woprDisconnects })
      .from(participants)
      .where(eq(participants.id, participantId))
      .get();

    const disconnectCount = updated?.woprDisconnects ?? 1;
    let deadManSwitch = false;

    if (disconnectCount >= 3) {
      await db
        .update(participants)
        .set({ diskWiped: true })
        .where(eq(participants.id, participantId))
        .run();
      deadManSwitch = true;
    }

    return NextResponse.json({
      response: result.response,
      action: result.action,
      deadManSwitch,
      disconnectCount,
    });
  }

  // When action is "sg", include the game list from server
  if (result.action === "sg") {
    return NextResponse.json({
      response: result.response,
      action: result.action,
      gameList: GAME_LIST,
    });
  }

  return NextResponse.json({
    response: result.response,
    action: result.action,
  });
}

// Endpoint to fetch launch art (called during nuke animation)
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  return NextResponse.json({
    a1: MISSILE_ART,
    a2: EXPLOSION_ART,
  });
}
