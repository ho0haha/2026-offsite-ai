import { generateToken } from "@/lib/crypto";

/**
 * Generate a flag token for a successful boardroom completion.
 * Reuses the existing CTF token system.
 */
export function generateBoardroomFlag(
  challengeId: string,
  participantId: string
): string {
  return generateToken(challengeId, participantId);
}
