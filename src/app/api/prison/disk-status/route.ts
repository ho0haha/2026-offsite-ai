import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTier7 } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Tier 7 gate — invisible to lower-tier users
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  const participant = await db
    .select({
      diskWiped: participants.diskWiped,
      woprDisconnects: participants.woprDisconnects,
    })
    .from(participants)
    .where(eq(participants.id, participantId))
    .get();

  if (!participant) {
    return NextResponse.json({}, { status: 404 });
  }

  return NextResponse.json({
    diskWiped: participant.diskWiped ?? false,
    woprDisconnects: participant.woprDisconnects ?? 0,
  });
}
