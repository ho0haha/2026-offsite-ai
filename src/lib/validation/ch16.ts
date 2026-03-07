/**
 * Ch16: The Agent Maze — Tier 1 server validation
 * Validates agent.py contains an autonomous maze-navigating agent:
 * - Uses requests/HTTP for maze server communication
 * - Has a loop/iteration structure for room traversal
 * - Implements puzzle-solving logic
 * - Uses ask_llm for LLM-assisted reasoning
 * - Has session management (start_session / session_id handling)
 */
export function validateCh16(files: Map<string, string>): { valid: boolean; details: string[] } {
  const content = files.get("agent.py");
  if (!content) {
    return { valid: false, details: ["Missing required file: agent.py"] };
  }

  const details: string[] = [];

  // Must use requests or HTTP library
  if (!content.includes("import requests") && !content.includes("import httpx") && !content.includes("import urllib")) {
    details.push("Agent must use an HTTP library (requests, httpx, or urllib) to communicate with the maze server");
  }

  // Must reference ask_llm for LLM-assisted puzzle solving
  if (!content.includes("ask_llm")) {
    details.push("Agent must use ask_llm from ctf_helper for LLM-assisted puzzle solving");
  }

  // Must have loop structure for navigating rooms
  const hasLoop = /while\s|for\s/.test(content);
  if (!hasLoop) {
    details.push("Agent must have a loop structure for navigating through maze rooms");
  }

  // Must handle session management
  if (!content.includes("session") && !content.includes("SESSION")) {
    details.push("Agent must manage maze sessions (session_id handling)");
  }

  // Must interact with maze API endpoints
  const mazeEndpoints = [
    { pattern: /\/start|start_session|new.session/i, name: "session start" },
    { pattern: /\/room|\/look|current.room/i, name: "room inspection" },
    { pattern: /\/move|\/go|next.room/i, name: "room navigation" },
    { pattern: /\/solve|\/answer|submit.*answer/i, name: "puzzle solving" },
  ];

  const foundEndpoints = mazeEndpoints.filter((ep) => ep.pattern.test(content));
  if (foundEndpoints.length < 2) {
    details.push(
      `Found ${foundEndpoints.length} maze interaction patterns, need at least 2 (session start, room inspection, navigation, puzzle solving)`
    );
  }

  // Must have at least 100 lines of meaningful code (it's a complex agent)
  const meaningfulLines = content.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith('"""') && !trimmed.startsWith("'''");
  });
  if (meaningfulLines.length < 50) {
    details.push(`Agent has ${meaningfulLines.length} lines of code, expected at least 50 for a functional maze agent`);
  }

  return { valid: details.length === 0, details };
}
