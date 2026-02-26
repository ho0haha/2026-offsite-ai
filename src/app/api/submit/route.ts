import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, submissions, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sseBroadcaster } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const { participantId, challengeId, flag } = await req.json();

    if (!participantId || !challengeId || !flag?.trim()) {
      return NextResponse.json(
        { error: "participantId, challengeId, and flag are required" },
        { status: 400 }
      );
    }

    // Get the challenge
    const challenge = db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .get();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if already solved
    const alreadySolved = db
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

    if (alreadySolved) {
      return NextResponse.json({
        correct: true,
        alreadySolved: true,
        message: "You already solved this challenge!",
      });
    }

    // Check the flag
    const isCorrect =
      flag.trim().toLowerCase() === challenge.flag.toLowerCase();
    const pointsAwarded = isCorrect ? challenge.points : 0;

    // Record submission
    db.insert(submissions)
      .values({
        id: nanoid(),
        participantId,
        challengeId,
        submittedFlag: flag.trim(),
        isCorrect,
        pointsAwarded,
        submittedAt: new Date().toISOString(),
      })
      .run();

    // Update participant total points if correct
    if (isCorrect) {
      const participant = db
        .select()
        .from(participants)
        .where(eq(participants.id, participantId))
        .get();

      if (participant) {
        db.update(participants)
          .set({ totalPoints: (participant.totalPoints ?? 0) + pointsAwarded })
          .where(eq(participants.id, participantId))
          .run();

        // Broadcast leaderboard update
        const leaderboard = db
          .select({
            id: participants.id,
            name: participants.name,
            totalPoints: participants.totalPoints,
          })
          .from(participants)
          .where(eq(participants.eventId, participant.eventId!))
          .orderBy(participants.totalPoints)
          .all()
          .reverse();

        sseBroadcaster.broadcast("leaderboard-update", {
          leaderboard,
          solve: {
            participantName: participant.name,
            challengeTitle: challenge.title,
            points: pointsAwarded,
          },
        });
      }
    }

    return NextResponse.json({
      correct: isCorrect,
      alreadySolved: false,
      pointsAwarded,
      message: isCorrect
        ? `Correct! +${pointsAwarded} points!`
        : "Incorrect flag. Try again!",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
