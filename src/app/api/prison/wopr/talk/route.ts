import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem } from "@/lib/auth";
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

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

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

  // Handle JOSHUA.EXE launch — initializes the session gate
  if (body.reset) {
    startJoshuaSession(participantId);
    return NextResponse.json({ ok: true });
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

  // null = no active JOSHUA session — return 404 to stay invisible
  if (!result) {
    return NextResponse.json({}, { status: 404 });
  }

  // Track disconnects and trigger dead man's switch
  if (result.action === "disconnect") {
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

  return NextResponse.json({
    response: result.response,
    action: result.action,
  });
}
