import { db } from "@/db";
import { challenges, submissions, participants, hintReveals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

type CreditResult =
  | { success: true; alreadySolved: false; pointsAwarded: number; message: string }
  | { success: true; alreadySolved: true; message: string }
  | { success: false; message: string };

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

  const pointsAwarded = Math.max(0, challenge.points - totalHintCost);

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

  return {
    success: true,
    alreadySolved: false,
    pointsAwarded,
    message: `Correct! +${pointsAwarded} points!${hintNote}`,
  };
}
