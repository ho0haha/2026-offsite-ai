import { db } from "@/db";
import { challenges, submissions, participants, hintReveals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

type CreditResult =
  | { success: true; alreadySolved: false; pointsAwarded: number; solvePosition: number; message: string }
  | { success: true; alreadySolved: true; message: string }
  | { success: false; message: string };

const SOLVE_BONUS: Record<number, { multiplier: number; label: string }> = {
  1: { multiplier: 1.3, label: "1st solve bonus: +30%" },
  2: { multiplier: 1.2, label: "2nd solve bonus: +20%" },
  3: { multiplier: 1.1, label: "3rd solve bonus: +10%" },
};

/**
 * Shared logic to credit a challenge solve for a participant.
 * Used by both /api/submit (flag/token) and /api/validate (server validation).
 */
export async function creditChallenge(
  participantId: string,
  challengeId: string,
  submittedValue: string
): Promise<CreditResult> {
  // Check if already solved
  const alreadySolvedRow = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.participantId, participantId),
        eq(submissions.challengeId, challengeId),
        eq(submissions.isCorrect, true)
      )
    )
    .get();

  if (alreadySolvedRow) {
    return {
      success: true,
      alreadySolved: true,
      message: "You already solved this challenge!",
    };
  }

  const challenge = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .get();

  if (!challenge) {
    return { success: false, message: "Challenge not found" };
  }

  // Count existing correct submissions for this challenge (across all participants)
  const correctSolves = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.challengeId, challengeId),
        eq(submissions.isCorrect, true)
      )
    )
    .all();
  const solvePosition = correctSolves.length + 1;

  // Apply first-solver bonus
  const bonus = SOLVE_BONUS[solvePosition];
  const multiplier = bonus ? bonus.multiplier : 1;

  // Calculate hint cost deduction for tier 4+ challenges
  let totalHintCost = 0;
  if (challenge.tier >= 4) {
    const reveals = await db
      .select({ cost: hintReveals.cost })
      .from(hintReveals)
      .where(
        and(
          eq(hintReveals.participantId, participantId),
          eq(hintReveals.challengeId, challengeId)
        )
      )
      .all();
    totalHintCost = reveals.reduce((sum, r) => sum + r.cost, 0);
  }

  const pointsAwarded = Math.max(0, Math.round(challenge.points * multiplier) - totalHintCost);

  // Record submission
  await db.insert(submissions)
    .values({
      id: nanoid(),
      participantId,
      challengeId,
      submittedFlag: submittedValue,
      isCorrect: true,
      pointsAwarded,
      submittedAt: new Date().toISOString(),
    })
    .run();

  // Update participant total points
  const participant = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .get();

  if (participant) {
    await db.update(participants)
      .set({ totalPoints: (participant.totalPoints ?? 0) + pointsAwarded })
      .where(eq(participants.id, participantId))
      .run();
  }

  const hintNote = totalHintCost > 0 ? ` (${totalHintCost} pts deducted for hints)` : "";
  const bonusNote = bonus ? ` (${bonus.label})` : "";

  return {
    success: true,
    alreadySolved: false,
    pointsAwarded,
    solvePosition,
    message: `Correct! +${pointsAwarded} points!${bonusNote}${hintNote}`,
  };
}
