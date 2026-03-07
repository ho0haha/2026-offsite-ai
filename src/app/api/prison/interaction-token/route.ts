import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { requireAuth } from "@/lib/auth";

const INTERACTION_SECRET =
  process.env.INTERACTION_SECRET || "prison-interaction-secret-change-me";

const TOKEN_TTL_MS = 120_000; // 120 seconds
const RATE_LIMIT_MS = 10_000; // 1 token per 10 seconds per participant

// In-memory rate-limit map: participantId -> last issued timestamp
const rateLimitMap = new Map<string, number>();

/**
 * Generate HMAC-SHA256 signed interaction token.
 * Format: INTERACT:<action>:<participantId>:<nonce>:<issuedAt>:<hmac>
 */
function signInteractionToken(
  action: string,
  participantId: string,
  nonce: string,
  issuedAt: number
): string {
  const payload = `INTERACT:${action}:${participantId}:${nonce}:${issuedAt}`;
  const hmac = createHmac("sha256", INTERACTION_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  return `${payload}:${hmac}`;
}


export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  // Validate action query param
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "boot" && action !== "modem") {
    return NextResponse.json(
      { error: "Invalid action. Must be 'boot' or 'modem'." },
      { status: 400 }
    );
  }

  // Rate-limit: 1 token per 10 seconds per participant
  const now = Date.now();
  const rateKey = `${participantId}:${action}`;
  const lastIssued = rateLimitMap.get(rateKey) || 0;
  if (now - lastIssued < RATE_LIMIT_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - lastIssued)) / 1000);
    return NextResponse.json(
      { error: "Rate limited. Try again later.", retryAfter },
      { status: 429 }
    );
  }
  rateLimitMap.set(rateKey, now);

  const nonce = randomBytes(16).toString("hex");
  const token = signInteractionToken(action, participantId, nonce, now);

  return NextResponse.json({
    interactionToken: token,
    expiresIn: TOKEN_TTL_MS / 1000,
  });
}
