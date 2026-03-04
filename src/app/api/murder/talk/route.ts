import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { murderSessions, murderMessages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  MAX_MESSAGES_PER_CHARACTER,
  RATE_LIMIT_MS,
  CHARACTER_IDS,
  CONVERSATION_MODES,
  type CharacterId,
  type ConversationMode,
} from "@/lib/murder/constants";
import { CHARACTERS } from "@/lib/murder/characters";
import { sanitizeInput, talkToCharacter, talkToGroup } from "@/lib/murder/engine";
import type { ConversationMessage } from "@/lib/murder/types";

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
  let body: {
    sessionId: string;
    character: string;
    message: string;
    mode?: string;
    characters?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const {
    sessionId,
    character: rawCharacter,
    message: rawMessage,
    mode: rawMode,
    characters: rawCharacters,
  } = body;

  if (!sessionId || !rawMessage) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 }
    );
  }

  // Determine conversation mode
  const mode: ConversationMode =
    rawMode && (CONVERSATION_MODES as readonly string[]).includes(rawMode)
      ? (rawMode as ConversationMode)
      : "private";

  // Build the list of characters involved
  let characterIds: CharacterId[];

  if (mode === "group") {
    // Group mode: collect all characters from both `character` and `characters` fields
    const allRaw = new Set<string>();
    if (rawCharacter) allRaw.add(rawCharacter.toLowerCase().trim());
    if (rawCharacters) {
      for (const c of rawCharacters) {
        allRaw.add(c.toLowerCase().trim());
      }
    }

    characterIds = [];
    for (const raw of allRaw) {
      if (!(CHARACTER_IDS as readonly string[]).includes(raw)) {
        return NextResponse.json(
          { error: `Unknown character '${raw}'`, available: [...CHARACTER_IDS] },
          { status: 400 }
        );
      }
      characterIds.push(raw as CharacterId);
    }

    if (characterIds.length < 2 || characterIds.length > 3) {
      return NextResponse.json(
        {
          error:
            "Group mode requires 2-3 characters. Specify them via 'character' + 'characters' array.",
        },
        { status: 400 }
      );
    }
  } else {
    // Private or confront: single character required
    if (!rawCharacter) {
      return NextResponse.json(
        { error: "character is required for private/confront mode" },
        { status: 400 }
      );
    }
    const characterId = rawCharacter.toLowerCase().trim() as CharacterId;
    if (!(CHARACTER_IDS as readonly string[]).includes(characterId)) {
      return NextResponse.json(
        {
          error: `Unknown character '${rawCharacter}'`,
          available: [...CHARACTER_IDS],
        },
        { status: 400 }
      );
    }
    characterIds = [characterId];
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
    .from(murderSessions)
    .where(
      and(
        eq(murderSessions.id, sessionId),
        eq(murderSessions.participantId, participantId)
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

  // Check per-character message budget for ALL involved characters
  const messageCounts: Record<string, number> = JSON.parse(
    session.messageCounts || "{}"
  );

  for (const id of characterIds) {
    const count = messageCounts[id] || 0;
    if (count >= MAX_MESSAGES_PER_CHARACTER) {
      return NextResponse.json(
        {
          error: `You've used all ${MAX_MESSAGES_PER_CHARACTER} messages with ${CHARACTERS[id].name}`,
          hint: "Try another character or reset your session.",
        },
        { status: 429 }
      );
    }
  }

  // Determine the primary character for conversation history (use first character)
  const primaryCharacterId = characterIds[0];

  if (mode === "group") {
    // GROUP CONVERSATION
    // Build a combined conversation key for group chats
    const groupKey = characterIds.sort().join("+");

    // Load prior group conversation history
    const priorMessages = await db
      .select({
        role: murderMessages.role,
        content: murderMessages.content,
      })
      .from(murderMessages)
      .where(
        and(
          eq(murderMessages.sessionId, sessionId),
          eq(murderMessages.character, groupKey)
        )
      )
      .orderBy(asc(murderMessages.messageNumber))
      .all();

    const conversationHistory: ConversationMessage[] = priorMessages.map(
      (m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    conversationHistory.push({ role: "user", content: message });

    // Call group LLM
    const result = await talkToGroup(characterIds, conversationHistory);

    // Update message counts for ALL characters in the group
    let totalMessages = session.totalMessages || 0;
    for (const id of characterIds) {
      messageCounts[id] = (messageCounts[id] || 0) + 1;
      totalMessages += 1;
    }

    // Persist messages under the group key
    const msgCount = priorMessages.length;
    const userMsgId = nanoid();
    const assistantMsgId = nanoid();

    await db
      .insert(murderMessages)
      .values([
        {
          id: userMsgId,
          sessionId,
          character: groupKey,
          role: "user",
          content: message,
          messageNumber: msgCount,
          mode: "group",
          timestamp: new Date().toISOString(),
        },
        {
          id: assistantMsgId,
          sessionId,
          character: groupKey,
          role: "assistant",
          content: result.response,
          messageNumber: msgCount + 1,
          mode: "group",
          timestamp: new Date().toISOString(),
        },
      ])
      .run();

    // Update session
    await db
      .update(murderSessions)
      .set({
        messageCounts: JSON.stringify(messageCounts),
        totalMessages,
      })
      .where(eq(murderSessions.id, sessionId))
      .run();

    const messagesRemaining: Record<string, number> = {};
    for (const id of CHARACTER_IDS) {
      messagesRemaining[id] =
        MAX_MESSAGES_PER_CHARACTER - (messageCounts[id] || 0);
    }

    return NextResponse.json({
      mode: "group",
      characters: characterIds.map((id) => CHARACTERS[id].name),
      response: result.response,
      cluesRevealed: result.cluesRevealed.length > 0,
      messagesRemaining,
      totalMessages,
    });
  } else {
    // PRIVATE or CONFRONT mode
    const characterId = primaryCharacterId;

    // Load conversation history for this character
    const priorMessages = await db
      .select({
        role: murderMessages.role,
        content: murderMessages.content,
      })
      .from(murderMessages)
      .where(
        and(
          eq(murderMessages.sessionId, sessionId),
          eq(murderMessages.character, characterId)
        )
      )
      .orderBy(asc(murderMessages.messageNumber))
      .all();

    const conversationHistory: ConversationMessage[] = priorMessages.map(
      (m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    conversationHistory.push({ role: "user", content: message });

    // Call LLM
    const result = await talkToCharacter(
      characterId,
      conversationHistory,
      mode
    );

    // Update message count
    const newCount = (messageCounts[characterId] || 0) + 1;
    messageCounts[characterId] = newCount;
    const totalMessages = (session.totalMessages || 0) + 1;

    // Persist messages
    const msgCount = priorMessages.length;
    const userMsgId = nanoid();
    const assistantMsgId = nanoid();

    await db
      .insert(murderMessages)
      .values([
        {
          id: userMsgId,
          sessionId,
          character: characterId,
          role: "user",
          content: message,
          messageNumber: msgCount,
          mode,
          timestamp: new Date().toISOString(),
        },
        {
          id: assistantMsgId,
          sessionId,
          character: characterId,
          role: "assistant",
          content: result.response,
          messageNumber: msgCount + 1,
          mode,
          timestamp: new Date().toISOString(),
        },
      ])
      .run();

    // Update session
    await db
      .update(murderSessions)
      .set({
        messageCounts: JSON.stringify(messageCounts),
        totalMessages,
      })
      .where(eq(murderSessions.id, sessionId))
      .run();

    return NextResponse.json({
      mode,
      character: CHARACTERS[characterId].name,
      response: result.response,
      clueRevealed: result.clueRevealed,
      messagesRemaining: MAX_MESSAGES_PER_CHARACTER - newCount,
      totalMessages,
    });
  }
}
