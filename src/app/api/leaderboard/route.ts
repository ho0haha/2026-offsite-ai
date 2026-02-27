import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participants, events } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();

  const leaderboard = (await db
    .select({
      id: participants.id,
      name: participants.name,
      totalPoints: participants.totalPoints,
    })
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .orderBy(participants.totalPoints)
    .all())
    .reverse();

  return NextResponse.json({
    leaderboard,
    event: event
      ? { name: event.name, endsAt: event.endsAt }
      : null,
  });
}
