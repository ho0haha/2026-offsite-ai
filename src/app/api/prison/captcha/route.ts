import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateCaptcha, verifyCaptcha } from "@/lib/prison/captcha";

/**
 * GET /api/prison/captcha
 * Generate a new captcha challenge.
 */
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const captcha = generateCaptcha();

  return NextResponse.json({
    lines: captcha.challenge,
    prompt: "Enter your answer:",
    token: captcha.token,
    type: captcha.type,
  });
}

/**
 * POST /api/prison/captcha
 * Verify a captcha answer.
 */
export async function POST(req: NextRequest) {
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  let body: { answer: string; token: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { answer, token } = body;
  if (!answer || !token) {
    return NextResponse.json(
      { error: "answer and token are required" },
      { status: 400 }
    );
  }

  const sessionToken = verifyCaptcha(answer, token, participantId);

  if (!sessionToken) {
    return NextResponse.json({ valid: false, sessionToken: null });
  }

  return NextResponse.json({ valid: true, sessionToken });
}
