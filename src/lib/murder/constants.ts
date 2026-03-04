export const MAX_MESSAGES_PER_CHARACTER = 6;
export const RATE_LIMIT_MS = 3000;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_ACCUSATION_ATTEMPTS = 3;
export const MAX_SCENE_EXAMINATIONS = 6;
export const CHALLENGE_SORT_ORDER = 18;
export const LLM_MODEL =
  process.env.MURDER_MODEL || "claude-sonnet-4-6";
export const LLM_MAX_TOKENS = 400;
export const LLM_GROUP_MAX_TOKENS = 600;

/**
 * Sentinel token the LLM outputs when a character's crack conditions are met.
 * The server replaces this with the actual clue text.
 */
export const CLUE_SENTINEL = "%%CLUE_REVEALED%%";

export const CHARACTER_IDS = [
  "diana",
  "marcus",
  "suki",
  "raj",
  "elena",
  "tommy",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export const CONVERSATION_MODES = ["private", "group", "confront"] as const;
export type ConversationMode = (typeof CONVERSATION_MODES)[number];

export const SCENE_AREAS = [
  "desk",
  "bathroom",
  "bookshelf",
  "window",
  "floor",
  "bar",
] as const;
export type SceneArea = (typeof SCENE_AREAS)[number];

/** Valid accusation values for each element (lowercased for matching) */
export const VALID_SUSPECTS = ["raj", "raj_patel", "patel"] as const;
export const VALID_METHODS = [
  "poison",
  "poisoning",
  "eye_drops",
  "tetrahydrozoline",
  "eyedrops",
] as const;
export const VALID_MOTIVES = [
  "ip_theft",
  "stolen_ip",
  "stolen_research",
  "intellectual_property",
  "research_theft",
] as const;

export const CORRECT_FLAG = "CTF{R4J_P01S0N_ST0L3N_1P}";
