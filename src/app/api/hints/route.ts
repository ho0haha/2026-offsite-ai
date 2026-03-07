import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, hintReveals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { participantId } = authResult;

    const body = await req.json();
    const { challengeId, hintIndex } = body;

    if (!challengeId || hintIndex === undefined || hintIndex === null) {
      return NextResponse.json(
        { error: "challengeId and hintIndex are required" },
        { status: 400 }
      );
    }

    // Get the challenge
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

    // Only tier 4+ challenges have hints
    if (challenge.tier < 4) {
      return NextResponse.json(
        { error: "Hints are not available for this tier" },
        { status: 400 }
      );
    }

    // Parse hints
    const hints: { text: string; cost: number }[] = challenge.hints
      ? JSON.parse(challenge.hints)
      : [];

    if (hintIndex < 0 || hintIndex >= hints.length) {
      return NextResponse.json(
        { error: "Invalid hint index" },
        { status: 400 }
      );
    }

    // Enforce sequential unlocking: must reveal all previous hints first
    if (hintIndex > 0) {
      const previousReveals = await db
        .select({ hintIndex: hintReveals.hintIndex })
        .from(hintReveals)
        .where(
          and(
            eq(hintReveals.participantId, participantId),
            eq(hintReveals.challengeId, challengeId)
          )
        )
        .all();

      const revealedIndices = new Set(previousReveals.map((r) => r.hintIndex));
      for (let i = 0; i < hintIndex; i++) {
        if (!revealedIndices.has(i)) {
          return NextResponse.json(
            { error: `You must unlock Hint ${i + 1} before unlocking Hint ${hintIndex + 1}` },
            { status: 400 }
          );
        }
      }
    }

    // Check if already revealed
    const existing = await db
      .select()
      .from(hintReveals)
      .where(
        and(
          eq(hintReveals.participantId, participantId),
          eq(hintReveals.challengeId, challengeId),
          eq(hintReveals.hintIndex, hintIndex)
        )
      )
      .get();

    if (existing) {
      return NextResponse.json({
        hint: hints[hintIndex].text,
        cost: hints[hintIndex].cost,
        alreadyRevealed: true,
      });
    }

    const hint = hints[hintIndex];

    // Record the reveal
    await db
      .insert(hintReveals)
      .values({
        id: nanoid(),
        participantId,
        challengeId,
        hintIndex,
        cost: hint.cost,
        revealedAt: new Date().toISOString(),
      })
      .run();

    // Calculate total hint cost for this challenge
    const allReveals = await db
      .select({ cost: hintReveals.cost })
      .from(hintReveals)
      .where(
        and(
          eq(hintReveals.participantId, participantId),
          eq(hintReveals.challengeId, challengeId)
        )
      )
      .all();

    const totalHintCost = allReveals.reduce((sum, r) => sum + r.cost, 0);
    const effectivePoints = Math.max(0, challenge.points - totalHintCost);

    return NextResponse.json({
      hint: hint.text,
      cost: hint.cost,
      alreadyRevealed: false,
      effectivePoints,
      totalHintCost,
    });
  } catch (error) {
    console.error("POST /api/hints error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
