import { generateToken } from "@/lib/crypto";

/**
 * Generate a flag token for a successful prison escape.
 * Uses the existing CTF token system.
 */
export function generateEscapeFlag(
  challengeId: string,
  participantId: string
): string {
  return generateToken(challengeId, participantId);
}
