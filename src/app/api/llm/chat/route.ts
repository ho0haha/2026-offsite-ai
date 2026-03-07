import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus } from "@/lib/tiers";
import { recordLlmCall } from "@/lib/llm-usage";

// In-memory rate limiter per participant
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000;
const MAX_TOKENS_CAP = 1024;
const MODEL = "claude-haiku-4-5-20251001";

// The LLM proxy is only available for challenges that need it (tier 3+)
const REQUIRED_TIER = 3;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured on server");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function POST(req: NextRequest) {
  // Require valid session token
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { participantId, eventId } = auth;

  // Require tier 3+ (challenges 8 & 9 use the LLM proxy)
  const tierStatus = await getParticipantTierStatus(participantId, eventId);
  if (tierStatus.maxTier < REQUIRED_TIER) {
    return NextResponse.json(
      { error: "LLM proxy is locked. Complete earlier tiers first." },
      { status: 403 }
    );
  }

  let body: {
    messages: { role: string; content: string }[];
    system?: string;
    max_tokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, system, max_tokens } = body;

  if (!messages?.length) {
    return NextResponse.json(
      { error: "messages are required" },
      { status: 400 }
    );
  }

  if (messages.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 messages per request" },
      { status: 400 }
    );
  }

  // Rate limit
  const now = Date.now();
  const lastCall = rateLimitMap.get(participantId) || 0;
  if (now - lastCall < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
    return NextResponse.json(
      { error: `Rate limited. Wait ${waitSec}s.` },
      { status: 429 }
    );
  }
  rateLimitMap.set(participantId, now);

  // Forward to Anthropic
  const client = getClient();
  const cappedTokens = Math.min(max_tokens || 1024, MAX_TOKENS_CAP);

  try {
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: cappedTokens,
      system: system || undefined,
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    const content =
      result.content[0].type === "text" ? result.content[0].text : "";

    recordLlmCall(participantId);

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
  }
}
