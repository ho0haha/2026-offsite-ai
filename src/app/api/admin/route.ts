import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  events,
  challenges,
  participants,
  submissions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// GET: Fetch all admin data
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  if (action === "events") {
    const allEvents = await db.select().from(events).all();
    return NextResponse.json(allEvents);
  }

  if (action === "challenges") {
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId required" },
        { status: 400 }
      );
    }
    const allChallenges = await db
      .select()
      .from(challenges)
      .where(eq(challenges.eventId, eventId))
      .orderBy(challenges.sortOrder)
      .all();
    return NextResponse.json(allChallenges);
  }

  if (action === "participants") {
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId required" },
        { status: 400 }
      );
    }
    const allParticipants = (await db
      .select()
      .from(participants)
      .where(eq(participants.eventId, eventId))
      .orderBy(participants.totalPoints)
      .all())
      .reverse();
    return NextResponse.json(allParticipants);
  }

  if (action === "submissions") {
    const eventId = req.nextUrl.searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId required" },
        { status: 400 }
      );
    }
    const allSubmissions = (await db
      .select({
        id: submissions.id,
        participantId: submissions.participantId,
        challengeId: submissions.challengeId,
        submittedFlag: submissions.submittedFlag,
        isCorrect: submissions.isCorrect,
        pointsAwarded: submissions.pointsAwarded,
        submittedAt: submissions.submittedAt,
        participantName: participants.name,
        challengeTitle: challenges.title,
      })
      .from(submissions)
      .innerJoin(participants, eq(submissions.participantId, participants.id))
      .innerJoin(challenges, eq(submissions.challengeId, challenges.id))
      .where(eq(participants.eventId, eventId))
      .orderBy(submissions.submittedAt)
      .all())
      .reverse();
    return NextResponse.json(allSubmissions);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST: Admin actions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Create event
    if (action === "create-event") {
      const { name, joinCode, startsAt, endsAt } = body;
      const event = {
        id: nanoid(),
        name,
        joinCode: (joinCode || nanoid(6)).toUpperCase(),
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        isActive: false,
      };
      await db.insert(events).values(event).run();
      return NextResponse.json(event);
    }

    // Toggle event active
    if (action === "toggle-event") {
      const { eventId, isActive } = body;
      await db.update(events)
        .set({ isActive })
        .where(eq(events.id, eventId))
        .run();
      return NextResponse.json({ success: true });
    }

    // Update event times
    if (action === "update-event") {
      const { eventId, startsAt, endsAt, name } = body;
      const updates: Record<string, unknown> = {};
      if (startsAt !== undefined) updates.startsAt = startsAt;
      if (endsAt !== undefined) updates.endsAt = endsAt;
      if (name !== undefined) updates.name = name;
      await db.update(events)
        .set(updates)
        .where(eq(events.id, eventId))
        .run();
      return NextResponse.json({ success: true });
    }

    // Create challenge
    if (action === "create-challenge") {
      const challenge = {
        id: nanoid(),
        eventId: body.eventId,
        title: body.title,
        description: body.description,
        category: body.category,
        difficulty: body.difficulty,
        points: body.points,
        flag: body.flag,
        tool: body.tool,
        hints: body.hints ? JSON.stringify(body.hints) : null,
        sortOrder: body.sortOrder || 0,
        starterUrl: body.starterUrl || null,
      };
      await db.insert(challenges).values(challenge).run();
      return NextResponse.json(challenge);
    }

    // Update challenge
    if (action === "update-challenge") {
      const { challengeId, ...updates } = body;
      if (updates.hints) updates.hints = JSON.stringify(updates.hints);
      delete updates.action;
      await db.update(challenges)
        .set(updates)
        .where(eq(challenges.id, challengeId))
        .run();
      return NextResponse.json({ success: true });
    }

    // Manual point override
    if (action === "override-points") {
      const { participantId, points, reason } = body;
      const participant = await db
        .select()
        .from(participants)
        .where(eq(participants.id, participantId))
        .get();

      if (!participant) {
        return NextResponse.json(
          { error: "Participant not found" },
          { status: 404 }
        );
      }

      await db.update(participants)
        .set({ totalPoints: (participant.totalPoints ?? 0) + points })
        .where(eq(participants.id, participantId))
        .run();

      // Record as a special submission
      await db.insert(submissions)
        .values({
          id: nanoid(),
          participantId,
          challengeId: "ADMIN_OVERRIDE",
          submittedFlag: reason || "Admin point override",
          isCorrect: true,
          pointsAwarded: points,
          submittedAt: new Date().toISOString(),
        })
        .run();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
