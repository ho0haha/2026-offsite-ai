import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  await db
    .update(participants)
    .set({ modemActivated: true })
    .where(eq(participants.id, participantId))
    .run();

  return NextResponse.json({ ok: true });
}
