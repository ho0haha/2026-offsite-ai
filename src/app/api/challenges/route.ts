import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, submissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  const participantId = req.nextUrl.searchParams.get("participantId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  const allChallenges = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      category: challenges.category,
      difficulty: challenges.difficulty,
      points: challenges.points,
      tool: challenges.tool,
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
  let solvedSet = new Set<string>();
  if (participantId) {
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
    solvedSet = new Set(solved.map((s) => s.challengeId!));
  }

  const result = allChallenges.map((c) => ({
    ...c,
    hints: c.hints ? JSON.parse(c.hints) : [],
    solved: solvedSet.has(c.id),
  }));

  return NextResponse.json(result);
}
