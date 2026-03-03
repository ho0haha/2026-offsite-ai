/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance deployments (Vercel serverless will reset on cold starts,
 * which is acceptable — it still blocks rapid bursts within a warm instance).
 */

const windows = new Map<string, number[]>();

// Prevent unbounded memory growth — evict stale keys periodically
const MAX_KEYS = 10_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < windowMs) return;
  lastCleanup = now;

  for (const [key, timestamps] of windows) {
    const filtered = timestamps.filter((t) => now - t < windowMs);
    if (filtered.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, filtered);
    }
  }

  // Hard cap — drop oldest keys if map is too large
  if (windows.size > MAX_KEYS) {
    const entries = [...windows.entries()];
    entries.sort((a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0));
    for (let i = 0; i < entries.length - MAX_KEYS; i++) {
      windows.delete(entries[i][0]);
    }
  }
}

/**
 * Check whether a request is allowed under the rate limit.
 *
 * @param key     Unique key (e.g. `join:${ip}` or `submit:${participantId}`)
 * @param limit   Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns       `{ allowed, retryAfterMs }`
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  cleanup(windowMs);

  const now = Date.now();
  const timestamps = windows.get(key) ?? [];

  // Remove timestamps outside the window
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  windows.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}
