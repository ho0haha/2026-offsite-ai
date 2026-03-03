import type { ParsedCommand, Verb } from "./types";
import { VERB_ALIASES } from "./constants";

const VALID_VERBS = new Set<string>([
  "go", "look", "examine", "take", "drop", "use", "combine", "read",
  "talk", "ask", "tell", "greet", "threaten", "whisper", "confess",
  "give", "bribe", "flatter", "insult", "open", "close", "push",
  "pull", "turn", "search", "inventory", "help", "wait", "listen",
  "smell", "knock", "enter", "restart",
]);

const PREPOSITIONS = new Set([
  "to", "at", "with", "on", "in", "into", "from", "about",
  "under", "over", "behind", "through", "around", "between",
]);

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim().toLowerCase();

  if (!raw) {
    return { raw, verb: null, noun: null, preposition: null, indirectObject: null, modifier: null };
  }

  // Check for direct verb aliases first (single word shortcuts)
  let expanded = raw;
  const firstWord = raw.split(/\s+/)[0];
  if (VERB_ALIASES[firstWord] && raw === firstWord) {
    expanded = VERB_ALIASES[firstWord];
  } else if (VERB_ALIASES[raw.replace(/\s+/g, "_")]) {
    expanded = VERB_ALIASES[raw.replace(/\s+/g, "_")];
  } else if (VERB_ALIASES[firstWord]) {
    // Replace just the verb part
    const rest = raw.slice(firstWord.length).trim();
    const aliasExpanded = VERB_ALIASES[firstWord];
    if (aliasExpanded.includes(" ")) {
      expanded = aliasExpanded + (rest ? " " + rest : "");
    } else {
      expanded = aliasExpanded + (rest ? " " + rest : "");
    }
  }

  const tokens = expanded.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { raw, verb: null, noun: null, preposition: null, indirectObject: null, modifier: null };
  }

  let verb: Verb | null = null;
  let noun: string | null = null;
  let preposition: string | null = null;
  let indirectObject: string | null = null;
  let modifier: string | null = null;

  // Extract verb
  if (VALID_VERBS.has(tokens[0])) {
    verb = tokens[0] as Verb;
  } else {
    // Try two-word verb lookup
    return { raw, verb: null, noun: null, preposition: null, indirectObject: null, modifier: null };
  }

  // Parse remaining tokens
  const remaining = tokens.slice(1);
  if (remaining.length === 0) {
    return { raw, verb, noun, preposition, indirectObject, modifier };
  }

  // Find preposition index
  let prepIdx = -1;
  for (let i = 0; i < remaining.length; i++) {
    if (PREPOSITIONS.has(remaining[i])) {
      prepIdx = i;
      break;
    }
  }

  if (prepIdx === -1) {
    // No preposition: everything is the noun (possibly with modifier)
    // Check for "closely", "carefully" etc. as modifier at end
    const lastWord = remaining[remaining.length - 1];
    if (["closely", "carefully", "thoroughly", "hard"].includes(lastWord) && remaining.length > 1) {
      modifier = lastWord;
      noun = remaining.slice(0, -1).join(" ");
    } else {
      noun = remaining.join(" ");
    }
  } else {
    // Words before preposition are noun, after are indirect object
    if (prepIdx > 0) {
      noun = remaining.slice(0, prepIdx).join(" ");
    }
    preposition = remaining[prepIdx];
    if (prepIdx < remaining.length - 1) {
      const afterPrep = remaining.slice(prepIdx + 1);
      const lastWord = afterPrep[afterPrep.length - 1];
      if (["closely", "carefully", "thoroughly", "hard"].includes(lastWord) && afterPrep.length > 1) {
        modifier = lastWord;
        indirectObject = afterPrep.slice(0, -1).join(" ");
      } else {
        indirectObject = afterPrep.join(" ");
      }
    }
  }

  return { raw, verb, noun, preposition, indirectObject, modifier };
}
