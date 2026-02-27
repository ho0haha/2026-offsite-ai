import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateChallenge } from "@/lib/validation";
import { creditChallenge } from "@/lib/credit";
import { generateToken } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const participantId = formData.get("participantId") as string | null;
    const challengeNumberStr = formData.get("challengeNumber") as string | null;

    if (!participantId || !challengeNumberStr) {
      return NextResponse.json(
        { valid: false, message: "participantId and challengeNumber are required" },
        { status: 400 }
      );
    }

    const challengeNumber = parseInt(challengeNumberStr, 10);
    if (isNaN(challengeNumber) || challengeNumber < 1 || challengeNumber > 12) {
      return NextResponse.json(
        { valid: false, message: "challengeNumber must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Verify participant exists
    const participant = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId))
      .get();

    if (!participant) {
      return NextResponse.json(
        { valid: false, message: "Participant not found" },
        { status: 404 }
      );
    }

    // Find challenge by sortOrder matching challengeNumber
    const challenge = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.sortOrder, challengeNumber),
          eq(challenges.eventId, participant.eventId!)
        )
      )
      .get();

    if (!challenge) {
      return NextResponse.json(
        { valid: false, message: `Challenge ${challengeNumber} not found` },
        { status: 404 }
      );
    }

    const validationType = challenge.validationType || "flag";
    if (validationType === "flag") {
      return NextResponse.json(
        { valid: false, message: "This challenge uses flag-based submission" },
        { status: 400 }
      );
    }

    const requiredFiles: string[] = challenge.requiredFiles
      ? JSON.parse(challenge.requiredFiles)
      : [];

    // Extract uploaded files
    const files = new Map<string, string>();
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file:") && value instanceof File) {
        const filename = key.slice(5); // Remove "file:" prefix
        const text = await value.text();
        files.set(filename, text);
      }
    }

    if (files.size === 0) {
      return NextResponse.json(
        { valid: false, message: "No files uploaded. Include files as file:{filename} form fields." },
        { status: 400 }
      );
    }

    // Run validation
    const result = validateChallenge(challengeNumber, validationType, files, requiredFiles);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        message: "Validation failed",
        details: result.details,
      });
    }

    // Validation passed — credit the challenge
    const creditResult = await creditChallenge(
      participantId,
      challenge.id,
      `validate:ch${challengeNumber}`
    );

    if (!creditResult.success) {
      return NextResponse.json({ valid: false, message: creditResult.message });
    }

    if (creditResult.alreadySolved) {
      return NextResponse.json({
        valid: true,
        alreadySolved: true,
        pointsAwarded: 0,
        message: creditResult.message,
      });
    }

    // Generate fallback token in case the client needs it
    const token = generateToken(challenge.id, participantId);

    return NextResponse.json({
      valid: true,
      alreadySolved: false,
      pointsAwarded: creditResult.pointsAwarded,
      message: creditResult.message,
      token,
    });
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json(
      { valid: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
