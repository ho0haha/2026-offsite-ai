import type { CharacterId, ConversationMode, SceneArea } from "./constants";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MurderSessionState {
  sessionId: string;
  participantId: string;
  eventId: string;
  messageCounts: Record<string, number>;
  accusationAttempts: number;
  totalMessages: number;
  isComplete: boolean;
  sceneExaminations: SceneArea[];
}

export interface Accusation {
  suspect: string;
  method: string;
  motive: string;
}

export interface AccusationResult {
  correct: boolean;
  correctCount: number;
  message: string;
}

export interface TalkRequest {
  sessionId: string;
  character: string;
  message: string;
  mode?: ConversationMode;
  /** For group mode: additional character IDs */
  characters?: string[];
}

export interface SceneExamineRequest {
  sessionId: string;
  examine: SceneArea;
}
