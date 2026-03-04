import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participants, events, submissions, challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Require a valid session token
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const eventId = req.nextUrl.searchParams.get("eventId") ?? auth.eventId;

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();

  const allParticipants = (await db
    .select({
      id: participants.id,
      name: participants.name,
      totalPoints: participants.totalPoints,
      nukedAt: participants.nukedAt,
      nukedBy: participants.nukedBy,
    })
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .orderBy(participants.totalPoints)
    .all())
    .reverse();

  // Get all challenges for tier calculation
  const allChallenges = await db
    .select({ id: challenges.id, tier: challenges.tier })
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .all();

  const totalByTier: Record<string, number> = {};
  for (const ch of allChallenges) {
    const t = String(ch.tier);
    totalByTier[t] = (totalByTier[t] || 0) + 1;
  }

  // Calculate maxTier for each participant
  const leaderboard = await Promise.all(
    allParticipants.map(async (p) => {
      const solved = await db
        .select({ challengeId: submissions.challengeId })
        .from(submissions)
        .where(
          and(
            eq(submissions.participantId, p.id),
            eq(submissions.isCorrect, true)
          )
        )
        .all();

      const solvedIds = new Set(solved.map((s) => s.challengeId));

      const solvesByTier: Record<string, number> = {};
      for (const ch of allChallenges) {
        const t = String(ch.tier);
        if (!solvesByTier[t]) solvesByTier[t] = 0;
        if (solvedIds.has(ch.id)) {
          solvesByTier[t]++;
        }
      }

      let maxTier = 1;
      if (totalByTier["1"] > 0 && (solvesByTier["1"] || 0) >= totalByTier["1"]) maxTier = 2;
      if (maxTier >= 2 && (solvesByTier["2"] || 0) >= 2) maxTier = 3;
      if (maxTier >= 3 && (solvesByTier["3"] || 0) >= 2) maxTier = 4;
      if (maxTier >= 4 && (solvesByTier["4"] || 0) >= 2) maxTier = 5;
      if (maxTier >= 5 && (solvesByTier["5"] || 0) >= 2) maxTier = 6;
      if (maxTier >= 6 && totalByTier["6"] > 0 && (solvesByTier["6"] || 0) >= totalByTier["6"]) maxTier = 7;

      return {
        name: p.name,
        totalPoints: p.totalPoints,
        maxTier,
        nukedAt: p.nukedAt,
        nukedBy: p.nukedBy,
      };
    })
  );

  return NextResponse.json({
    leaderboard,
    event: event
      ? { name: event.name, endsAt: event.endsAt }
      : null,
  });
}
