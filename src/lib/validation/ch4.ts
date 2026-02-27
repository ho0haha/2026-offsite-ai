/**
 * Ch4: Production Incident — Tier 1 server validation
 * Checks that app/server.py contains proper connection cleanup:
 * - Must have a `finally` block
 * - Must call `release_connection` in the cleanup path
 */
export function validateCh4(files: Map<string, string>): { valid: boolean; details: string[] } {
  const content = files.get("app/server.py");
  if (!content) {
    return { valid: false, details: ["Missing required file: app/server.py"] };
  }

  const details: string[] = [];

  if (!content.includes("finally")) {
    details.push("Missing 'finally' block for connection cleanup");
  }

  if (!content.includes("release_connection")) {
    details.push("Missing 'release_connection' call in cleanup path");
  }

  return { valid: details.length === 0, details };
}
