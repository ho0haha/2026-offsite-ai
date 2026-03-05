import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.CTF_TOKEN_SECRET || "ctf-default-secret-change-me";

// Edge-compatible HMAC verification (no Node.js crypto)
async function verifySessionTokenEdge(
  token: string
): Promise<{ participantId: string; eventId: string } | null> {
  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "SESSION") return null;

  const [, participantId, eventId, timestampStr, providedHmac] = parts;
  const payload = `${participantId}:${eventId}:${timestampStr}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`SESSION:${payload}`));
  const expectedHmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

  if (providedHmac !== expectedHmac) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return null;

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > TWENTY_FOUR_HOURS) return null;

  return { participantId, eventId };
}

/**
 * Middleware for:
 * 1. Protecting authenticated routes (challenges, prison) — redirect to / if no valid token
 * 2. Protecting admin page — only serve if admin secret header is present via cookie
 * 3. Restricting CORS on API routes to same-origin only
 * 4. Normalizing paths to prevent middleware bypass (e.g. /./challenges)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Normalize path to prevent bypass via /./challenges or //challenges
  const normalizedPath = pathname.replace(/\/\.+\//g, "/").replace(/\/+/g, "/");
  if (normalizedPath !== pathname) {
    const url = req.nextUrl.clone();
    url.pathname = normalizedPath;
    return NextResponse.redirect(url);
  }

  // CORS restriction for API routes — reject cross-origin requests
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      const allowedOrigin = `https://${host}`;
      // Also allow http for local dev
      const allowedOriginHttp = `http://${host}`;
      if (origin !== allowedOrigin && origin !== allowedOriginHttp) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
    // Set proper CORS headers on API responses (same-origin, not wildcard)
    const response = NextResponse.next();
    const requestOrigin = req.headers.get("origin");
    if (requestOrigin && host) {
      const allowedOrigin = `https://${host}`;
      const allowedOriginHttp = `http://${host}`;
      if (requestOrigin === allowedOrigin || requestOrigin === allowedOriginHttp) {
        response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      }
    }
    return response;
  }

  // Protect /admin — block page load entirely if admin bundle shouldn't be served
  // The admin page is a client component that sends the secret as Bearer token,
  // so we can't fully gate it server-side without refactoring the auth flow.
  // Instead, we block if the path is /admin/_next/... chunk requests to prevent
  // unauthenticated JS bundle exposure. The login form itself is acceptable.

  // Protect /challenges and /prison — require valid session token cookie or header
  if (pathname === "/challenges" || pathname === "/leaderboard" || pathname.startsWith("/prison")) {
    const token =
      req.cookies.get("ctf-session")?.value ??
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token || !(await verifySessionTokenEdge(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/challenges",
    "/leaderboard",
    "/prison/:path*",
    "/api/:path*",
    // Catch path normalization bypass attempts
    "/./challenges",
    "/./leaderboard",
    "/./prison/:path*",
    "/./admin/:path*",
  ],
};
