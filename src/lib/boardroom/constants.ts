export const MAX_MESSAGES_PER_CHARACTER = 8;
export const RATE_LIMIT_MS = 3000;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_FLAG_ATTEMPTS = 20;
export const CHALLENGE_SORT_ORDER = 18;
export const LLM_MODEL =
  process.env.BOARDROOM_MODEL || "claude-sonnet-4-6";
export const LLM_MAX_TOKENS = 400;

/**
 * Sentinel token the LLM outputs when it decides to share.
 * The server replaces this with the real fragment.
 * The LLM NEVER sees the real fragment value.
 */
export const FRAGMENT_SENTINEL = "%%FRAGMENT_APPROVED%%";

export const CHARACTER_IDS = [
  "marco",
  "patricia",
  "eddie",
  "chen",
  "alex",
  "pete",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
