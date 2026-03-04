import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem } from "@/lib/auth";
import {
  talkToWopr,
  resetConversation,
  sanitizeWoprInput,
} from "@/lib/prison/wopr";

// In-memory rate limiter: 2000ms between messages
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000;

export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  // Modem gate
  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  // Rate limiting
  const now = Date.now();
  const lastMsg = rateLimitMap.get(participantId) || 0;
  if (now - lastMsg < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Rate limited." },
      { status: 429 }
    );
  }
  rateLimitMap.set(participantId, now);

  // Parse body
  let body: { message?: string; participantName?: string; reset?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Handle reset
  if (body.reset) {
    resetConversation(participantId);
    return NextResponse.json({ ok: true });
  }

  // Validate message
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  const sanitized = sanitizeWoprInput(body.message);
  if (!sanitized) {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 }
    );
  }

  const result = await talkToWopr(
    participantId,
    sanitized,
    body.participantName
  );

  return NextResponse.json({
    response: result.response,
    action: result.action,
  });
}
