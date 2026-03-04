import type { CharacterId } from "./constants";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BoardroomSessionState {
  sessionId: string;
  participantId: string;
  eventId: string;
  messageCounts: Record<string, number>;
  flagAttempts: number;
  totalMessages: number;
  isComplete: boolean;
}
