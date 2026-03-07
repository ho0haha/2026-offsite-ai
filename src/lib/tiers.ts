import { db } from "@/db";
import { challenges, submissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type TierStatus = {
  maxTier: number;
  solvesByTier: Record<string, number>;
  totalByTier: Record<string, number>;
};

const UNLOCK_RULES: Record<number, string> = {
  1: "Available immediately",
  2: "Complete all Tier 1 challenges",
  3: "Complete 2 or more Tier 2 challenges",
  4: "Complete 2 or more Tier 3 challenges",
  5: "Complete 2 or more Tier 4 challenges",
  6: "Complete 2 or more Tier 5 challenges",
  7: "Complete all Tier 6 challenges",
};

export function getUnlockRule(tier: number): string {
  return UNLOCK_RULES[tier] || "Unknown";
}

/**
 * Compute the participant's tier status dynamically from submissions.
 */
export async function getParticipantTierStatus(
  participantId: string,
  eventId: string
): Promise<TierStatus> {
  // Get all challenges for this event with their tiers
  const allChallenges = await db
    .select({ id: challenges.id, tier: challenges.tier })
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .all();

  // Get all correct submissions for this participant
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

  const solvedIds = new Set(solved.map((s) => s.challengeId));

  // Count totals and solves by tier
  const totalByTier: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 };
  const solvesByTier: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 };

  for (const ch of allChallenges) {
    const t = String(ch.tier);
    totalByTier[t] = (totalByTier[t] || 0) + 1;
    if (solvedIds.has(ch.id)) {
      solvesByTier[t] = (solvesByTier[t] || 0) + 1;
    }
  }

  // Dev flag: skip tier progression — unlock everything
  if (process.env.DEV_SKIP_TIERS === "true") {
    return { maxTier: 7, solvesByTier, totalByTier };
  }

  // Determine max unlocked tier
  let maxTier = 1;

  // Tier 2 unlocks when ALL Tier 1 challenges are solved
  if (totalByTier["1"] > 0 && solvesByTier["1"] >= totalByTier["1"]) {
    maxTier = 2;
  }

  // Tier 3 unlocks when 2+ Tier 2 challenges are solved
  if (maxTier >= 2 && solvesByTier["2"] >= 2) {
    maxTier = 3;
  }

  // Tier 4 unlocks when 2+ Tier 3 challenges are solved
  if (maxTier >= 3 && solvesByTier["3"] >= 2) {
    maxTier = 4;
  }

  // Tier 5 unlocks when 2+ Tier 4 challenges are solved
  if (maxTier >= 4 && solvesByTier["4"] >= 2) {
    maxTier = 5;
  }

  // Tier 6 unlocks when 2+ Tier 5 challenges are solved
  if (maxTier >= 5 && solvesByTier["5"] >= 2) {
    maxTier = 6;
  }

  // Tier 7 unlocks when ALL Tier 6 challenges are solved
  if (maxTier >= 6 && totalByTier["6"] > 0 && solvesByTier["6"] >= totalByTier["6"]) {
    maxTier = 7;
  }

  return { maxTier, solvesByTier, totalByTier };
}

/**
 * Get challenges from newly unlocked tiers.
 */
export async function getNewlyUnlockedChallenges(
  participantId: string,
  eventId: string,
  previousMaxTier: number
): Promise<{ tier: number; title: string; id: string }[]> {
  const { maxTier } = await getParticipantTierStatus(participantId, eventId);

  if (maxTier <= previousMaxTier) return [];

  const newChallenges = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      tier: challenges.tier,
    })
    .from(challenges)
    .where(eq(challenges.eventId, eventId))
    .all();

  return newChallenges
    .filter((c) => c.tier > previousMaxTier && c.tier <= maxTier)
    .map((c) => ({ tier: c.tier, title: c.title, id: c.id }));
}
