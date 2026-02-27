import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, submissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { verifyToken } from "@/lib/crypto";
import { creditChallenge } from "@/lib/credit";

export async function POST(req: NextRequest) {
  try {
    const { participantId, challengeId, flag } = await req.json();

    if (!participantId || !challengeId || !flag?.trim()) {
      return NextResponse.json(
        { error: "participantId, challengeId, and flag are required" },
        { status: 400 }
      );
    }

    const trimmedFlag = flag.trim();

    // Token verification path: if flag starts with "CTF:", treat as HMAC token
    if (trimmedFlag.startsWith("CTF:")) {
      const tokenData = verifyToken(trimmedFlag);
      if (!tokenData) {
        return NextResponse.json({
          correct: false,
          alreadySolved: false,
          pointsAwarded: 0,
          message: "Invalid or expired token.",
        });
      }

      if (tokenData.participantId !== participantId) {
        return NextResponse.json({
          correct: false,
          alreadySolved: false,
          pointsAwarded: 0,
          message: "Token does not match your session.",
        });
      }

      const result = await creditChallenge(participantId, tokenData.challengeId, `token:${trimmedFlag}`);
      if (!result.success) {
        return NextResponse.json({ correct: false, alreadySolved: false, pointsAwarded: 0, message: result.message });
      }
      if (result.alreadySolved) {
        return NextResponse.json({ correct: true, alreadySolved: true, message: result.message });
      }
      return NextResponse.json({
        correct: true,
        alreadySolved: false,
        pointsAwarded: result.pointsAwarded,
        message: result.message,
      });
    }

    // Legacy flag comparison path
    const challenge = await db
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

    const isCorrect =
      trimmedFlag.toLowerCase() === challenge.flag.toLowerCase();

    if (isCorrect) {
      // Use shared credit logic (records submission, updates points)
      const result = await creditChallenge(participantId, challengeId, trimmedFlag);
      if (!result.success) {
        return NextResponse.json({ correct: false, alreadySolved: false, pointsAwarded: 0, message: result.message });
      }
      if (result.alreadySolved) {
        return NextResponse.json({ correct: true, alreadySolved: true, message: result.message });
      }
      return NextResponse.json({
        correct: true,
        alreadySolved: false,
        pointsAwarded: result.pointsAwarded,
        message: result.message,
      });
    }

    // Incorrect flag — record the wrong submission
    await db.insert(submissions)
      .values({
        id: nanoid(),
        participantId,
        challengeId,
        submittedFlag: trimmedFlag,
        isCorrect: false,
        pointsAwarded: 0,
        submittedAt: new Date().toISOString(),
      })
      .run();

    return NextResponse.json({
      correct: false,
      alreadySolved: false,
      pointsAwarded: 0,
      message: "Incorrect flag. Try again!",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
