import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateSessionToken } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = checkRateLimit(`join:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name : "";
    const joinCode = typeof body.joinCode === "string" ? body.joinCode : "";
    const secretKey = typeof body.secretKey === "string" ? body.secretKey : "";

    if (!name.trim() || !joinCode.trim()) {
      return NextResponse.json(
        { error: "Name and event code are required" },
        { status: 400 }
      );
    }

    // Find active event with this join code
    const event = await db
      .select()
      .from(events)
      .where(and(eq(events.joinCode, joinCode.trim().toUpperCase()), eq(events.isActive, true)))
      .get();

    if (!event) {
      return NextResponse.json(
        { error: "Invalid event code or event is not active" },
        { status: 404 }
      );
    }

    // Check if participant already exists
    const existing = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.name, name.trim()),
          eq(participants.eventId, event.id)
        )
      )
      .get();

    if (existing) {
      // Existing participant — require secret key
      if (!secretKey.trim()) {
        return NextResponse.json({
          error: "This name is already registered. Enter your secret key to log back in.",
          requiresSecretKey: true,
        }, { status: 401 });
      }

      if (existing.secretKey !== secretKey.trim()) {
        return NextResponse.json({
          error: "Incorrect secret key.",
          requiresSecretKey: true,
        }, { status: 401 });
      }

      // Secret key matches — issue token
      const token = generateSessionToken(existing.id, event.id);
      const res = NextResponse.json({
        participant: { id: existing.id, name: existing.name, eventId: existing.eventId, joinedAt: existing.joinedAt, totalPoints: existing.totalPoints },
        event: { id: event.id, name: event.name },
        token,
        isNew: false,
      });
      res.cookies.set("ctf-session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours, matches token expiry
      });
      return res;
    }

    // New participant — create with generated secret key
    const generatedKey = nanoid(12);
    const participant = {
      id: nanoid(),
      name: name.trim(),
      eventId: event.id,
      joinedAt: new Date().toISOString(),
      totalPoints: 0,
      secretKey: generatedKey,
    };

    await db.insert(participants).values(participant).run();

    const token = generateSessionToken(participant.id, event.id);
    const res = NextResponse.json({
      participant: { id: participant.id, name: participant.name, eventId: participant.eventId, joinedAt: participant.joinedAt, totalPoints: participant.totalPoints },
      event: { id: event.id, name: event.name },
      token,
      secretKey: generatedKey,
      isNew: true,
    });
    res.cookies.set("ctf-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (error) {
    console.error("POST /api/join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
