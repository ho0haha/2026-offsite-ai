import { createHmac } from "crypto";

const SECRET = process.env.CTF_TOKEN_SECRET || "ctf-default-secret-change-me";

/**
 * Generate a fallback HMAC token for manual submission.
 * Format: CTF:{challengeId}:{participantId}:{timestamp}:{hmac}
 */
export function generateToken(
  challengeId: string,
  participantId: string
): string {
  const timestamp = Date.now().toString();
  const payload = `${challengeId}:${participantId}:${timestamp}`;
  const hmac = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  return `CTF:${challengeId}:${participantId}:${timestamp}:${hmac}`;
}

/**
 * Verify an HMAC token and extract its payload.
 * Returns null if the token is invalid or expired (>1 hour).
 */
export function verifyToken(
  token: string
): { challengeId: string; participantId: string; timestamp: number } | null {
  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "CTF") return null;

  const [, challengeId, participantId, timestampStr, providedHmac] = parts;
  const payload = `${challengeId}:${participantId}:${timestampStr}`;
  const expectedHmac = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);

  if (providedHmac !== expectedHmac) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  // Tokens expire after 1 hour
  const ONE_HOUR = 60 * 60 * 1000;
  if (Date.now() - timestamp > ONE_HOUR) return null;

  return { challengeId, participantId, timestamp };
}

/**
 * Generate a session token for authenticated API access.
 * Format: SESSION:{participantId}:{eventId}:{timestamp}:{hmac}
 */
export function generateSessionToken(
  participantId: string,
  eventId: string
): string {
  const timestamp = Date.now().toString();
  const payload = `${participantId}:${eventId}:${timestamp}`;
  const hmac = createHmac("sha256", SECRET).update(`SESSION:${payload}`).digest("hex").slice(0, 16);
  return `SESSION:${participantId}:${eventId}:${timestamp}:${hmac}`;
}

/**
 * Verify a session token and extract its payload.
 * Returns null if the token is invalid or expired (>24 hours).
 */
export function verifySessionToken(
  token: string
): { participantId: string; eventId: string } | null {
  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "SESSION") return null;

  const [, participantId, eventId, timestampStr, providedHmac] = parts;
  const payload = `${participantId}:${eventId}:${timestampStr}`;
  const expectedHmac = createHmac("sha256", SECRET)
    .update(`SESSION:${payload}`)
    .digest("hex")
    .slice(0, 16);

  if (providedHmac !== expectedHmac) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  // Session tokens expire after 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > TWENTY_FOUR_HOURS) return null;

  return { participantId, eventId };
}
