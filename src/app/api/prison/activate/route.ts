import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTier7 } from "@/lib/auth";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyInteractionToken } from "@/lib/interaction-token";

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Require tier 7 to activate modem
  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  // Require a valid interaction token proving genuine browser interaction
  let body: { interactionToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body
  }

  const { interactionToken } = body;
  if (!interactionToken) {
    return NextResponse.json(
      { error: "Missing interactionToken. Modem activation requires browser interaction." },
      { status: 403 }
    );
  }

  const tokenPayload = verifyInteractionToken(
    interactionToken,
    "modem",
    participantId
  );
  if (!tokenPayload) {
    return NextResponse.json(
      { error: "Invalid or expired interaction token." },
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
