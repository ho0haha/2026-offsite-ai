import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, submissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus, getUnlockRule } from "@/lib/tiers";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { participantId, eventId } = authResult;

  const allChallenges = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      category: challenges.category,
      difficulty: challenges.difficulty,
      points: challenges.points,
      tier: challenges.tier,
      hints: challenges.hints,
      sortOrder: challenges.sortOrder,
      starterUrl: challenges.starterUrl,
      validationType: challenges.validationType,
    })
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .orderBy(challenges.sortOrder)
    .all();

  // Get solved challenges for this participant
  const solved = await db
    .select({ challengeId: submissions.challengeId })
    .from(submissions)
    .where(
      and(
        eq(submissions.participantId, participantId),
        eq(submissions.isCorrect, true)
      )
    )
    .all();
  const solvedSet = new Set(solved.map((s) => s.challengeId!));

  // Get tier status
  const tierStatus = await getParticipantTierStatus(participantId, eventId);

  // Group challenges by tier
  const tierMap: Record<number, typeof allChallenges> = {};
  for (const c of allChallenges) {
    if (!tierMap[c.tier]) tierMap[c.tier] = [];
    tierMap[c.tier].push(c);
  }

  const tiers = Object.entries(tierMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([tierStr, tierChallenges]) => {
      const tierNum = Number(tierStr);
      const unlocked = tierNum <= tierStatus.maxTier;

      return {
        tier: tierNum,
        unlocked,
        unlockRule: getUnlockRule(tierNum),
        challenges: tierChallenges.map((c) => {
          if (unlocked) {
            return {
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              difficulty: c.difficulty,
              points: c.points,
              tier: c.tier,
              hints: c.hints ? JSON.parse(c.hints) : [],
              sortOrder: c.sortOrder,
              starterUrl: c.starterUrl,
              validationType: c.validationType,
              solved: solvedSet.has(c.id),
            };
          }
          // Locked tier: return stub data only
          return {
            id: c.id,
            title: c.title,
            points: c.points,
            difficulty: c.difficulty,
            tier: c.tier,
            sortOrder: c.sortOrder,
            locked: true,
          };
        }),
      };
    });

  // Compute total points from solved challenges
  let totalPoints = 0;
  for (const c of allChallenges) {
    if (solvedSet.has(c.id)) totalPoints += c.points;
  }

  return NextResponse.json({
    tiers,
    progress: {
      currentMaxTier: tierStatus.maxTier,
      totalPoints,
      solvesByTier: tierStatus.solvesByTier,
      totalByTier: tierStatus.totalByTier,
    },
  });
}
