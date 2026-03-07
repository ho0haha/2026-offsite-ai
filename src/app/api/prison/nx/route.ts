import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem, requireTier7 } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { participantId, eventId } = auth;

  // Tier 7 gate
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  let body: { targetParticipantId?: string; targetParticipantName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { targetParticipantId, targetParticipantName } = body;
  if (!targetParticipantId && !targetParticipantName) {
    return NextResponse.json(
      { error: "targetParticipantId or targetParticipantName is required" },
      { status: 400 }
    );
  }

  // Fetch attacker
  const attacker = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .get();

  if (!attacker) {
    return NextResponse.json({ error: "Attacker not found" }, { status: 404 });
  }

  // Fetch target by ID or by name within the same event
  let target;
  if (targetParticipantId) {
    target = await db
      .select()
      .from(participants)
      .where(eq(participants.id, targetParticipantId))
      .get();
  } else {
    target = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.name, targetParticipantName!),
          eq(participants.eventId, eventId)
        )
      )
      .get();
  }

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  // Validate same event
  if (target.eventId !== eventId) {
    return NextResponse.json({ error: "Target is not in your event" }, { status: 400 });
  }

  // Cannot nuke self
  if (target.id === participantId) {
    return NextResponse.json({ error: "Cannot nuke yourself" }, { status: 400 });
  }

  // Attacker must have > 0 points
  if ((attacker.totalPoints ?? 0) <= 0) {
    return NextResponse.json(
      { success: false, message: "LAUNCH SYSTEMS OFFLINE. NO RESOURCES AVAILABLE." },
      { status: 400 }
    );
  }

  // Target must not already be at 0
  if ((target.totalPoints ?? 0) <= 0) {
    return NextResponse.json(
      { success: false, message: "TARGET ALREADY NEUTRALIZED." },
      { status: 400 }
    );
  }

  // Escalating cost: costPercent = 0.10 * (2.25 ** nukesLaunched)
  const nukesLaunched = attacker.nukesLaunched ?? 0;
  const costPercent = 0.10 * Math.pow(2.25, nukesLaunched);

  // Block if cost >= 100%
  if (costPercent >= 1.0) {
    return NextResponse.json(
      { success: false, message: "LAUNCH SYSTEMS DEPLETED. INSUFFICIENT RESOURCES." },
      { status: 400 }
    );
  }

  const attackerOldScore = attacker.totalPoints ?? 0;
  const attackerNewScore = Math.floor(attackerOldScore * (1 - costPercent));
  const targetOldScore = target.totalPoints ?? 0;

  // Calculate how many more nukes before cost exceeds 100%
  let lr = 0;
  for (let i = nukesLaunched + 1; i < 10; i++) {
    if (0.10 * Math.pow(2.25, i) < 1.0) {
      lr++;
    } else {
      break;
    }
  }

  // Apply: target score -> 0, attacker score reduced, track nuke
  await db
    .update(participants)
    .set({
      totalPoints: 0,
      nukedAt: new Date().toISOString(),
      nukedBy: attacker.name,
    })
    .where(eq(participants.id, target.id));

  await db
    .update(participants)
    .set({
      totalPoints: attackerNewScore,
      nukesLaunched: nukesLaunched + 1,
    })
    .where(eq(participants.id, participantId));

  return NextResponse.json({
    success: true,
    attackerOldScore,
    attackerNewScore,
    costPercent,
    targetName: target.name,
    targetOldScore,
    lr,
  });
}
