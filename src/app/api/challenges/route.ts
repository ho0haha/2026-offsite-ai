import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, submissions, hintReveals, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus, getUnlockRule } from "@/lib/tiers";

export async function GET(req: NextRequest) {
  try {
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

    // Get all correct submissions (for solve position calculation)
    const allCorrectSubmissions = await db
      .select({
        challengeId: submissions.challengeId,
        participantId: submissions.participantId,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(eq(submissions.isCorrect, true))
      .all();

    // Build solve count map and per-user solve position map
    const solveCountMap: Record<string, number> = {};
    const solvesByChallenge: Record<string, { participantId: string; submittedAt: string }[]> = {};
    for (const s of allCorrectSubmissions) {
      if (!s.challengeId) continue;
      solveCountMap[s.challengeId] = (solveCountMap[s.challengeId] || 0) + 1;
      if (!solvesByChallenge[s.challengeId]) solvesByChallenge[s.challengeId] = [];
      solvesByChallenge[s.challengeId].push({
        participantId: s.participantId!,
        submittedAt: s.submittedAt!,
      });
    }

    // For each challenge, sort by time and find this user's position
    const userSolvePositionMap: Record<string, number> = {};
    for (const [chId, solves] of Object.entries(solvesByChallenge)) {
      solves.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
      const idx = solves.findIndex((s) => s.participantId === participantId);
      if (idx !== -1) {
        userSolvePositionMap[chId] = idx + 1; // 1-indexed position
      }
    }

    // Get tier status
    const tierStatus = await getParticipantTierStatus(participantId, eventId);

    // Get all hint reveals for this participant
    const reveals = await db
      .select({
        challengeId: hintReveals.challengeId,
        hintIndex: hintReveals.hintIndex,
        cost: hintReveals.cost,
      })
      .from(hintReveals)
      .where(eq(hintReveals.participantId, participantId))
      .all();

    // Group reveals by challenge
    const revealsByChallenge: Record<string, { hintIndex: number; cost: number }[]> = {};
    for (const r of reveals) {
      if (!r.challengeId) continue;
      if (!revealsByChallenge[r.challengeId]) revealsByChallenge[r.challengeId] = [];
      revealsByChallenge[r.challengeId].push({ hintIndex: r.hintIndex, cost: r.cost });
    }

    // Group challenges by tier
    const tierMap: Record<number, typeof allChallenges> = {};
    for (const c of allChallenges) {
      if (!tierMap[c.tier]) tierMap[c.tier] = [];
      tierMap[c.tier].push(c);
    }

    const tiers = Object.entries(tierMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .filter(([tierStr]) => {
        const tierNum = Number(tierStr);
        // Only include unlocked tiers
        return tierNum <= tierStatus.maxTier;
      })
      .map(([tierStr, tierChallenges]) => {
        const tierNum = Number(tierStr);

        return {
          tier: tierNum,
          unlocked: true,
          unlockRule: getUnlockRule(tierNum),
          challenges: tierChallenges.map((c) => {
            const challengeReveals = revealsByChallenge[c.id] || [];
            const totalHintCost = challengeReveals.reduce((sum, r) => sum + r.cost, 0);
            const revealedIndices = new Set(challengeReveals.map((r) => r.hintIndex));

            // Parse hints
            const rawHints = c.hints ? JSON.parse(c.hints) : [];

            // For tier 4+, include hint metadata with costs and reveal status
            let hintsMeta: { text?: string; cost: number; revealed: boolean }[] | null = null;
            if (c.tier >= 4 && rawHints.length > 0) {
              hintsMeta = rawHints.map((h: { text: string; cost: number } | string, i: number) => {
                const isObj = typeof h === "object" && h !== null;
                const revealed = revealedIndices.has(i);
                return {
                  text: revealed ? (isObj ? h.text : h) : undefined,
                  cost: isObj ? h.cost : 0,
                  revealed,
                };
              });
            }

            return {
              id: c.id,
              title: c.title,
              description: c.description,
              category: c.category,
              difficulty: c.difficulty,
              points: c.points,
              tier: c.tier,
              hints: c.tier >= 4 ? hintsMeta : null,
              effectivePoints: c.tier >= 4 ? Math.max(0, c.points - totalHintCost) : c.points,
              totalHintCost: c.tier >= 4 ? totalHintCost : 0,
              sortOrder: c.sortOrder,
              starterUrl: c.starterUrl,
              validationType: c.validationType,
              solved: solvedSet.has(c.id),
              solveCount: solveCountMap[c.id] || 0,
              solvePosition: solvedSet.has(c.id) ? (userSolvePositionMap[c.id] ?? null) : null,
            };
          }),
        };
      });

    // Fetch real totalPoints from participants table (includes speed bonuses and hint deductions)
    const participant = await db
      .select({ totalPoints: participants.totalPoints })
      .from(participants)
      .where(eq(participants.id, participantId))
      .get();

    // Compute base total (points minus hint costs, no speed bonuses)
    let baseTotal = 0;
    for (const c of allChallenges) {
      if (solvedSet.has(c.id)) {
        const hintCost = (revealsByChallenge[c.id] || []).reduce((s, r) => s + r.cost, 0);
        baseTotal += Math.max(0, c.points - hintCost);
      }
    }
    const realTotal = participant?.totalPoints ?? 0;
    const speedBonus = realTotal - baseTotal;

    return NextResponse.json({
      tiers,
      progress: {
        currentMaxTier: tierStatus.maxTier,
        totalPoints: realTotal,
        speedBonus,
        solvesByTier: tierStatus.solvesByTier,
        totalByTier: tierStatus.totalByTier,
      },
    });
  } catch (error) {
    console.error("GET /api/challenges error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
