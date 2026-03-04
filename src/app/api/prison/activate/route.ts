import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTier7 } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Require tier 7 to activate modem
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  await db
    .update(participants)
    .set({ modemActivated: true })
    .where(eq(participants.id, participantId))
    .run();

  return NextResponse.json({ ok: true });
}
