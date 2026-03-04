import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus } from "@/lib/tiers";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Require tier 5 to activate modem (same as prison/start)
  const tierStatus = await getParticipantTierStatus(participantId, eventId);
  if (tierStatus.maxTier < 5) {
    return NextResponse.json(
      { error: "You must reach Tier 5 to access this feature." },
      { status: 403 }
    );
  }

  await db
    .update(participants)
    .set({ modemActivated: true })
    .where(eq(participants.id, participantId))
    .run();

  return NextResponse.json({ ok: true });
}
