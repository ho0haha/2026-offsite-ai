import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";

// In-memory rate limiter per participant
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 2000;
const MAX_TOKENS_CAP = 1024;
const MODEL = "claude-haiku-4-5-20251001";

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
  let body: {
    participantId: string;
    messages: { role: string; content: string }[];
    system?: string;
    max_tokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { participantId, messages, system, max_tokens } = body;

  if (!participantId || !messages?.length) {
    return NextResponse.json(
      { error: "participantId and messages are required" },
      { status: 400 }
    );
  }

  if (messages.length > 20) {
    return NextResponse.json(
      { error: "Maximum 20 messages per request" },
      { status: 400 }
    );
  }

  // Validate participant exists
  const participant = await db
    .select({ id: participants.id })
    .from(participants)
    .where(eq(participants.id, participantId))
    .get();

  if (!participant) {
    return NextResponse.json(
      { error: "Invalid participant" },
      { status: 403 }
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
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content =
      result.content[0].type === "text" ? result.content[0].text : "";

    return NextResponse.json({ content });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message.slice(0, 100) : "Unknown error";
    return NextResponse.json({ error: `LLM error: ${msg}` }, { status: 502 });
  }
}
