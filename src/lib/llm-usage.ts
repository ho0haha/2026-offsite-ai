/**
 * In-memory LLM call tracker per participant.
 *
 * Tracks how many times each participant has called the /api/llm/chat proxy.
 * Used to enforce that LLM-dependent challenges (8, 9) actually use the
 * provided LLM endpoint rather than hardcoding deterministic answers.
 *
 * In-memory is fine here — calls and validation happen in the same server
 * process during a session. Cold starts reset counts, but that just means
 * the participant needs to re-run their solution (which makes LLM calls).
 */

const callCounts = new Map<string, number>();

/** Challenges that require LLM proxy usage to submit. */
export const LLM_REQUIRED_CHALLENGES = new Set([8, 9]);

/** Minimum number of LLM calls required before submission is accepted. */
export const MIN_LLM_CALLS = 3;

/** Record an LLM call for a participant. */
export function recordLlmCall(participantId: string): void {
  callCounts.set(participantId, (callCounts.get(participantId) ?? 0) + 1);
}

/** Get the number of LLM calls made by a participant. */
export function getLlmCallCount(participantId: string): number {
  return callCounts.get(participantId) ?? 0;
}

/** Check whether a participant has made enough LLM calls for a given challenge. */
export function hasEnoughLlmCalls(
  participantId: string,
  challengeNumber: number
): boolean {
  if (!LLM_REQUIRED_CHALLENGES.has(challengeNumber)) return true;
  return getLlmCallCount(participantId) >= MIN_LLM_CALLS;
}
