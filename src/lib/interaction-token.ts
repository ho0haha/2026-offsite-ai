import { createHmac } from "crypto";

const INTERACTION_SECRET =
  process.env.INTERACTION_SECRET || "prison-interaction-secret-change-me";
const TOKEN_TTL_MS = 120_000; // 120 seconds

// Set of used nonces to prevent replay attacks (in-memory; resets on deploy)
const usedNonces = new Set<string>();

// Periodically clean old nonces (keep set from growing unbounded)
// Nonces older than TTL can't be replayed anyway, so we just cap the set size.
const MAX_NONCE_SET_SIZE = 10_000;

export interface InteractionTokenPayload {
  action: string;
  participantId: string;
  nonce: string;
  issuedAt: number;
}

/**
 * Verify an HMAC-signed interaction token.
 * Returns the payload if valid, or null if invalid/expired/replayed.
 * On success, the nonce is consumed (single-use).
 */
export function verifyInteractionToken(
  token: string,
  expectedAction: string,
  expectedParticipantId: string
): InteractionTokenPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(":");
  // Format: INTERACT:<action>:<participantId>:<nonce>:<issuedAt>:<hmac>
  if (parts.length !== 6 || parts[0] !== "INTERACT") return null;

  const [, action, participantId, nonce, issuedAtStr, providedHmac] = parts;

  // Check action and participant match expectations
  if (action !== expectedAction) return null;
  if (participantId !== expectedParticipantId) return null;

  // Verify HMAC signature
  const payload = `INTERACT:${action}:${participantId}:${nonce}:${issuedAtStr}`;
  const expectedHmac = createHmac("sha256", INTERACTION_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  if (providedHmac !== expectedHmac) return null;

  // Check expiry
  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return null;
  if (Date.now() - issuedAt > TOKEN_TTL_MS) return null;

  // Check replay — nonce must not have been used before
  if (usedNonces.has(nonce)) return null;

  // Consume the nonce
  usedNonces.add(nonce);

  // Prevent unbounded growth
  if (usedNonces.size > MAX_NONCE_SET_SIZE) {
    // Clear oldest half (Set maintains insertion order)
    const entries = [...usedNonces];
    const toRemove = entries.slice(0, entries.length / 2);
    toRemove.forEach((n) => usedNonces.delete(n));
  }

  return { action, participantId, nonce, issuedAt };
}
