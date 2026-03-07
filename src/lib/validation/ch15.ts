/**
 * Ch15: The Undocumented API — Tier 1 server validation
 * Validates solution.py contains a proper API discovery script:
 * - Uses requests/HTTP library
 * - Implements HMAC authentication
 * - Interacts with multiple API endpoints (health, auth, menu, order, verify)
 * - Has at least 5 distinct HTTP calls
 */
export function validateCh15(files: Map<string, string>): { valid: boolean; details: string[] } {
  const content = files.get("solution.py");
  if (!content) {
    return { valid: false, details: ["Missing required file: solution.py"] };
  }

  const details: string[] = [];
  const lower = content.toLowerCase();

  // Must use requests or urllib for HTTP calls
  if (!content.includes("import requests") && !content.includes("import urllib") && !content.includes("import httpx")) {
    details.push("Solution must use an HTTP library (requests, httpx, or urllib)");
  }

  // Must implement HMAC authentication
  if (!content.includes("hmac") && !content.includes("HMAC")) {
    details.push("Solution must implement HMAC authentication (import hmac or use HMAC)");
  }

  // Must interact with key endpoints
  const requiredEndpoints = [
    { pattern: /\/health/i, name: "/health" },
    { pattern: /\/api\/auth/i, name: "/api/auth" },
    { pattern: /\/api\/menu/i, name: "/api/menu" },
    { pattern: /\/api\/order/i, name: "/api/order" },
    { pattern: /\/api\/verify|\/verify/i, name: "/api/verify" },
  ];

  const foundEndpoints = requiredEndpoints.filter((ep) => ep.pattern.test(content));
  if (foundEndpoints.length < 4) {
    details.push(
      `Found ${foundEndpoints.length} API endpoint references, need at least 4 (health, auth, menu, order, verify)`
    );
  }

  // Must have multiple HTTP method calls
  const httpCalls = content.match(/\.(get|post|put|patch|delete)\s*\(/gi) || [];
  if (httpCalls.length < 5) {
    details.push(`Found ${httpCalls.length} HTTP calls, need at least 5 for the full workflow`);
  }

  return { valid: details.length === 0, details };
}
