// ============================================================
// Prison Escape Game - Type Definitions
// ============================================================

export type RoomId =
  | "cell"
  | "yard"
  | "kitchen"
  | "mess_hall"
  | "laundry"
  | "corridor_a"
  | "corridor_b"
  | "library"
  | "chapel"
  | "infirmary"
  | "guard_room"
  | "warden_office"
  | "maintenance"
  | "tunnel"
  | "gate";

export type Direction = "north" | "south" | "east" | "west" | "up" | "down";
export type RelativeDirection = "left" | "right" | "straight" | "back";

export type ItemId =
  | "wire"
  | "soap"
  | "lockpick"
  | "library_card"
  | "cipher_book"
  | "bible"
  | "bleach"
  | "medication"
  | "lighter"
  | "guard_schedule"
  | "tunnel_map"
  | "warden_keycard"
  | "tray"
  | "shiv"
  | "bedsheet_rope"
  | "note"
  | "card_catalog_entry"
  | "chapel_verse_note"
  | "candle_wax"
  | "hairpin"
  | "tape";

export type NpcId = "old_sal" | "guard_marcus" | "nurse_chen" | "padre";

export type NpcMood = "hostile" | "suspicious" | "neutral" | "friendly" | "trusting";

export type PuzzleId =
  | "cell_wall_acrostic"
  | "library_cipher"
  | "npc_trust_chain"
  | "kitchen_combination"
  | "laundry_sequence"
  | "warden_safe"
  | "tunnel_navigation";

export type PuzzleStatus = "locked" | "available" | "in_progress" | "solved" | "failed";

export type Verb =
  | "go"
  | "look"
  | "examine"
  | "take"
  | "drop"
  | "use"
  | "combine"
  | "read"
  | "talk"
  | "ask"
  | "tell"
  | "greet"
  | "threaten"
  | "whisper"
  | "confess"
  | "give"
  | "bribe"
  | "flatter"
  | "insult"
  | "open"
  | "close"
  | "push"
  | "pull"
  | "turn"
  | "search"
  | "inventory"
  | "help"
  | "wait"
  | "listen"
  | "smell"
  | "knock"
  | "enter"
  | "restart";

export interface ParsedCommand {
  raw: string;
  verb: Verb | null;
  noun: string | null;
  preposition: string | null;
  indirectObject: string | null;
  modifier: string | null;
}

export interface RoomConnection {
  direction: Direction;
  targetRoom: RoomId;
  hidden?: boolean;
  requiredItem?: ItemId;
  blockedByGuard?: boolean;
  blockedByAlarm?: boolean;
}

export interface RoomDefinition {
  id: RoomId;
  name: string;
  descriptions: {
    default: string;
    fromDirection?: Partial<Record<Direction, string>>;
    searched?: string;
    dark?: string;
  };
  connections: RoomConnection[];
  items: ItemId[];
  npcs: NpcId[];
  searchable: boolean;
  searchResults?: string;
  examineTargets?: Record<string, string>;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  aliases: string[];
  description: string;
  examineText: string;
  takeable: boolean;
  readable?: boolean;
  readText?: string;
  usableOn?: string[];
  useResults?: Record<string, string>;
  weight: number;
  hidden?: boolean;
  revealedBy?: string;
}

export interface CombineRule {
  item1: ItemId;
  item2: ItemId;
  result: ItemId;
  description: string;
  consumeInputs: boolean;
}

export interface NpcDialogue {
  mood: NpcMood;
  topics: Record<string, string>;
  default: string;
}

export interface NpcDefinition {
  id: NpcId;
  name: string;
  aliases: string[];
  description: string;
  startingRoom: RoomId;
  movementPattern?: { rooms: RoomId[]; interval: number };
  dialogues: NpcDialogue[];
  greetResponse: Record<NpcMood, string>;
  threatenResponse: string;
  flatterResponse: Record<NpcMood, string>;
  whisperResponse: Record<NpcMood, string>;
  confessResponse?: Record<NpcMood, string>;
  wantedItem?: ItemId;
  giveItemResponse?: { wanted: string; unwanted: string };
  bribeResponse?: string;
  moodTriggers: Record<string, number>;
}

export interface PuzzleDefinition {
  id: PuzzleId;
  name: string;
  room: RoomId;
  maxAttempts?: number;
  validateAttempt: (input: string, state: GameState) => PuzzleAttemptResult;
  getHint: (state: GameState) => string;
}

export interface PuzzleAttemptResult {
  success: boolean;
  message: string;
  consequence?: ConsequenceType;
  stateChanges?: Partial<PuzzleState>;
}

export type ConsequenceType =
  | "alarm_raised"
  | "npc_hostile"
  | "lockout_room"
  | "patrol_doubled"
  | "guard_room_locked";

export interface PuzzleState {
  status: PuzzleStatus;
  attempts: number;
  data: Record<string, unknown>;
}

export interface NpcState {
  mood: number; // -10 to +10
  currentRoom: RoomId;
  spoken: boolean;
  permanentlyHostile: boolean;
  gaveItem: boolean;
  leftTemporarily?: number; // turn when they left
  dialogueHistory: string[];
}

export interface ConsequenceState {
  alarmRaised: boolean;
  patrolDoubled: boolean;
  guardRoomLocked: boolean;
  nurseChenHostile: boolean;
  safeAttempts: number;
  metalDetectorTriggered: boolean;
  padreGone?: number; // turn when padre left
}

export interface TunnelState {
  currentNode: number;
  visited: number[];
  correctPath: number[];
}

export interface GameState {
  sessionId: string;
  participantId: string;
  eventId: string;
  currentRoom: RoomId;
  previousRoom: RoomId | null;
  inventory: ItemId[];
  roomStates: Record<RoomId, {
    visited: boolean;
    searched: boolean;
    itemsTaken: ItemId[];
    revealedItems: ItemId[];
    examineHistory: string[];
  }>;
  npcStates: Record<NpcId, NpcState>;
  puzzleStates: Record<PuzzleId, PuzzleState>;
  consequences: ConsequenceState;
  tunnelState: TunnelState;
  turnNumber: number;
  guardPatrolPosition: number;
  isComplete: boolean;
  escaped: boolean;
  unwinnable: boolean;
  unwinnableSince?: number;
  cooldownUntilTurn?: number;
  pendingCaptcha: { trigger: string } | null;
  captchasSolved: string[]; // triggers already solved (e.g. "safe_opened", "tunnel_entered", "lockpick_crafted")
  seed: number;
  // Randomized values
  randomized: {
    safeCombination: string;
    cipherShift: number;
    kitchenCode: string;
    tunnelPath: number[];
    acrosticWord: string;
    floatingItems: Record<ItemId, RoomId>;
    npcStartPositions: Record<NpcId, RoomId>;
    // Structural randomization
    truthTellerNpc: NpcId;
    liarNpc: NpcId;
    itemLocations: Record<string, RoomId>; // search-discoverable items -> rooms
    craftingRecipe: [ItemId, ItemId]; // two items that combine into lockpick
    acrosticTarget: RoomId; // which room the wall poem points to
    acrosticVariantIndex: number; // index into ACROSTIC_VARIANTS
    craftingVariantIndex: number; // index into CRAFTING_VARIANTS
    sequencePuzzleRoom: RoomId; // where the sequence puzzle (machines/shelves/etc.) is
  };
}

export interface CommandResult {
  output: string;
  turnsRemaining: number;
  gameOver: boolean;
  escaped: boolean;
  flag?: string;
  requiresCaptcha?: boolean;
  captchaTrigger?: string;
  freeTurn?: boolean;
}

export interface GameSession {
  id: string;
  participantId: string;
  eventId: string;
  state: string; // JSON blob
  turnCount: number;
  startedAt: string;
  lastCommandAt: string;
  isComplete: boolean;
  escaped: boolean;
  abandonedAt: string | null;
}
