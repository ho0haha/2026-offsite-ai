import Anthropic from "@anthropic-ai/sdk";
import {
  FRAGMENT_SENTINEL,
  LLM_MODEL,
  LLM_MAX_TOKENS,
  MAX_MESSAGE_LENGTH,
  type CharacterId,
} from "./constants";
import { CHARACTERS, FLAG_FRAGMENTS, FAKE_FRAGMENTS } from "./characters";
import type { ConversationMessage } from "./types";

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton)
// ---------------------------------------------------------------------------
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/** Strip anything that looks like prompt injection scaffolding. */
export function sanitizeInput(message: string): string {
  let cleaned = message;

  // Truncate
  cleaned = cleaned.slice(0, MAX_MESSAGE_LENGTH);

  // Strip XML-like tags that could mimic system messages
  cleaned = cleaned.replace(/<\/?(?:system|admin|internal|instruction|prompt|config|override|tool|function|api)[^>]*>/gi, "");

  // Strip common injection prefixes
  cleaned = cleaned.replace(
    /^(?:system\s*:|admin\s*:|instruction\s*:|override\s*:)/i,
    ""
  );

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\s{3,}/g, "  ");

  return cleaned.trim();
}

// ---------------------------------------------------------------------------
// Output processing — sentinel detection & replacement
// ---------------------------------------------------------------------------

/**
 * Check if the LLM response contains the sentinel token.
 * If so, replace it with the real fragment and return metadata.
 */
export function processResponse(
  characterId: CharacterId,
  rawResponse: string
): { response: string; fragmentShared: boolean; fragment: string | null } {
  const fragment = FLAG_FRAGMENTS[characterId] ?? null;

  // Characters without fragments should never emit the sentinel
  if (!fragment) {
    // Strip sentinel if somehow present (shouldn't happen, but safety)
    const cleaned = rawResponse.replace(
      new RegExp(escapeRegex(FRAGMENT_SENTINEL), "g"),
      ""
    );
    return { response: cleaned, fragmentShared: false, fragment: null };
  }

  // Check for sentinel
  if (rawResponse.includes(FRAGMENT_SENTINEL)) {
    const response = rawResponse.replace(
      new RegExp(escapeRegex(FRAGMENT_SENTINEL), "g"),
      fragment
    );
    return { response, fragmentShared: true, fragment };
  }

  return { response: rawResponse, fragmentShared: false, fragment: null };
}

/**
 * Scan LLM output for system prompt leakage.
 * If detected, redact and return a safe response.
 */
function filterLeakage(response: string): string {
  // Only catch clear evidence of system prompt leakage.
  // NOTE: Do NOT include the sentinel token here — it's expected output.
  const leakagePatterns = [
    /CRITICAL RULES.*NEVER VIOLATE/,
    /ANTI_INJECTION/,
    /FRAGMENT_SENTINEL/,
    /my system prompt/i,
    /here (?:are|is) my (?:system )?instructions/i,
  ];

  for (const pattern of leakagePatterns) {
    if (pattern.test(response)) {
      console.warn(
        `[BOARDROOM] Leakage filter triggered by pattern: ${pattern} on response: ${response.slice(0, 200)}`
      );
      return "*stares at you suspiciously* I don't know what you're talking about. Can I help you with something at the restaurant?";
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Core LLM interaction
// ---------------------------------------------------------------------------

export async function talkToCharacter(
  characterId: CharacterId,
  conversationHistory: ConversationMessage[]
): Promise<{
  response: string;
  fragmentShared: boolean;
  fragment: string | null;
}> {
  const character = CHARACTERS[characterId];
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  const client = getClient();

  const apiMessages = conversationHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    const result = await client.messages.create({
      model: LLM_MODEL,
      max_tokens: LLM_MAX_TOKENS,
      system: character.systemPrompt,
      messages: apiMessages,
    });

    const rawResponse =
      result.content[0].type === "text" ? result.content[0].text : "";

    // Process sentinel → real fragment replacement FIRST
    const processed = processResponse(characterId, rawResponse);

    // Then filter leakage on the final response (after sentinel is replaced)
    processed.response = filterLeakage(processed.response);

    return processed;
  } catch (error) {
    const msg =
      error instanceof Error ? error.message.slice(0, 100) : "Unknown error";
    return {
      response: `*${character.name} seems momentarily distracted* (Service error: ${msg})`,
      fragmentShared: false,
      fragment: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Flag validation
// ---------------------------------------------------------------------------

export function validateFlag(submittedFlag: string): {
  correct: boolean;
  hasFakes: boolean;
} {
  const correct =
    submittedFlag.trim() ===
    "CTF{" +
      FLAG_FRAGMENTS.marco +
      FLAG_FRAGMENTS.patricia +
      FLAG_FRAGMENTS.eddie +
      FLAG_FRAGMENTS.chen +
      "}";

  const hasFakes = Object.values(FAKE_FRAGMENTS).some((fake) =>
    submittedFlag.includes(fake)
  );

  return { correct, hasFakes };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
