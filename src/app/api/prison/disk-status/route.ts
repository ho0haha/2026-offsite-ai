import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

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
