import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateSessionToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, joinCode } = await req.json();

    if (!name?.trim() || !joinCode?.trim()) {
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
      const token = generateSessionToken(existing.id, event.id);
      return NextResponse.json({
        participant: existing,
        event: { id: event.id, name: event.name },
        token,
      });
    }

    // Create new participant
    const participant = {
      id: nanoid(),
      name: name.trim(),
      eventId: event.id,
      joinedAt: new Date().toISOString(),
      totalPoints: 0,
    };

    await db.insert(participants).values(participant).run();

    const token = generateSessionToken(participant.id, event.id);
    return NextResponse.json({
      participant,
      event: { id: event.id, name: event.name },
      token,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
