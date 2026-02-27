/**
 * Ch4: Production Incident — Tier 1 server validation
 * Checks that app/server.py contains proper connection cleanup:
 * - Must have a `finally` block
 * - Must call `release_connection` in the cleanup path
 * - All get_connection() calls must be protected by finally blocks
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

  const finallyCount = (content.match(/finally/g) || []).length;
  const getConnCount = (content.match(/get_connection/g) || []).length;
  if (finallyCount < getConnCount) {
    details.push("Not all get_connection() calls are protected by finally blocks");
  }

  return { valid: details.length === 0, details };
}
