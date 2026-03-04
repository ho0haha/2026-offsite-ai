import { generateToken } from "@/lib/crypto";

/**
 * Generate a flag token for a successful murder mystery completion.
 * Reuses the existing CTF token system.
 */
export function generateMurderFlag(
  challengeId: string,
  participantId: string
): string {
  return generateToken(challengeId, participantId);
}
