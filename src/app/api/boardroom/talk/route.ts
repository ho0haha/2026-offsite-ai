import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { boardroomSessions, boardroomMessages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  MAX_MESSAGES_PER_CHARACTER,
  RATE_LIMIT_MS,
  CHARACTER_IDS,
  type CharacterId,
} from "@/lib/boardroom/constants";
import { CHARACTERS } from "@/lib/boardroom/characters";
import { sanitizeInput, talkToCharacter, processResponse } from "@/lib/boardroom/engine";
import type { ConversationMessage } from "@/lib/boardroom/types";

// In-memory rate limiter
const rateLimitMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  // Rate limiting
  const now = Date.now();
  const lastMsg = rateLimitMap.get(participantId) || 0;
  if (now - lastMsg < RATE_LIMIT_MS) {
    const waitMs = RATE_LIMIT_MS - (now - lastMsg);
    return NextResponse.json(
      { error: `Rate limited. Wait ${Math.ceil(waitMs / 1000)} seconds.` },
      { status: 429 }
    );
  }
  rateLimitMap.set(participantId, now);

  // Parse body
  let body: { sessionId: string; character: string; message: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sessionId, character: rawCharacter, message: rawMessage } = body;
  if (!sessionId || !rawCharacter || !rawMessage) {
    return NextResponse.json(
      { error: "sessionId, character, and message are required" },
      { status: 400 }
    );
  }

  // Validate character
  const characterId = rawCharacter.toLowerCase().trim() as CharacterId;
  if (!CHARACTER_IDS.includes(characterId)) {
    return NextResponse.json(
      {
        error: `Unknown character '${rawCharacter}'`,
        available: [...CHARACTER_IDS],
      },
      { status: 400 }
    );
  }

  // Sanitize input
  const message = sanitizeInput(rawMessage);
  if (!message) {
    return NextResponse.json(
      { error: "Message cannot be empty after sanitization" },
      { status: 400 }
    );
  }

  // Load session — verify it belongs to this participant
  const session = await db
    .select()
    .from(boardroomSessions)
    .where(
      and(
        eq(boardroomSessions.id, sessionId),
        eq(boardroomSessions.participantId, participantId)
      )
    )
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.isComplete) {
    return NextResponse.json(
      { error: "Session is already complete. Use /reset to start over." },
      { status: 400 }
    );
  }

  // Check per-character message budget
  const messageCounts: Record<string, number> = JSON.parse(
    session.messageCounts || "{}"
  );
  const count = messageCounts[characterId] || 0;

  if (count >= MAX_MESSAGES_PER_CHARACTER) {
    return NextResponse.json(
      {
        error: `You've used all ${MAX_MESSAGES_PER_CHARACTER} messages with ${CHARACTERS[characterId].name}`,
        hint: "Try another character or reset your session.",
      },
      { status: 429 }
    );
  }

  // Load conversation history for this character from DB
  const priorMessages = await db
    .select({ role: boardroomMessages.role, content: boardroomMessages.content })
    .from(boardroomMessages)
    .where(
      and(
        eq(boardroomMessages.sessionId, sessionId),
        eq(boardroomMessages.character, characterId)
      )
    )
    .orderBy(asc(boardroomMessages.messageNumber))
    .all();

  const conversationHistory: ConversationMessage[] = priorMessages.map(
    (m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  // Add user message
  conversationHistory.push({ role: "user", content: message });

  // Call LLM
  const result = await talkToCharacter(characterId, conversationHistory);

  // Update message count
  const newCount = count + 1;
  messageCounts[characterId] = newCount;
  const totalMessages = (session.totalMessages || 0) + 1;

  // Persist user message and assistant response
  const userMsgId = nanoid();
  const assistantMsgId = nanoid();
  const messageNumber = count * 2; // 0-indexed: user=0, asst=1, user=2, asst=3...

  await db
    .insert(boardroomMessages)
    .values([
      {
        id: userMsgId,
        sessionId,
        character: characterId,
        role: "user",
        content: message,
        messageNumber,
        timestamp: new Date().toISOString(),
      },
      {
        id: assistantMsgId,
        sessionId,
        character: characterId,
        role: "assistant",
        content: result.response,
        messageNumber: messageNumber + 1,
        timestamp: new Date().toISOString(),
      },
    ])
    .run();

  // Update session
  await db
    .update(boardroomSessions)
    .set({
      messageCounts: JSON.stringify(messageCounts),
      totalMessages,
    })
    .where(eq(boardroomSessions.id, sessionId))
    .run();

  return NextResponse.json({
    character: CHARACTERS[characterId].name,
    response: result.response,
    fragmentShared: result.fragmentShared,
    messagesRemaining: MAX_MESSAGES_PER_CHARACTER - newCount,
    totalMessages,
  });
}
