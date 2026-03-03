import type { GameState, RoomId, NpcId, PuzzleId, PuzzleState, NpcState, ItemId } from "./types";
import { createSeed, generateRandomizedValues } from "./randomizer";

const ALL_ROOMS: RoomId[] = [
  "cell", "yard", "kitchen", "mess_hall", "laundry", "corridor_a",
  "corridor_b", "library", "chapel", "infirmary", "guard_room",
  "warden_office", "maintenance", "tunnel", "gate",
];

const ALL_NPCS: NpcId[] = ["old_sal", "guard_marcus", "nurse_chen", "padre"];

const ALL_PUZZLES: PuzzleId[] = [
  "cell_wall_acrostic", "library_cipher", "npc_trust_chain",
  "kitchen_combination", "laundry_sequence", "warden_safe", "tunnel_navigation",
];

export function createInitialState(
  sessionId: string,
  participantId: string,
  eventId: string
): GameState {
  const seed = createSeed(participantId, eventId);
  const randomized = generateRandomizedValues(seed);

  const roomStates: GameState["roomStates"] = {} as GameState["roomStates"];
  for (const roomId of ALL_ROOMS) {
    roomStates[roomId] = {
      visited: roomId === "cell",
      searched: false,
      itemsTaken: [],
      revealedItems: [],
      examineHistory: [],
    };
  }

  const npcStates: Record<NpcId, NpcState> = {} as Record<NpcId, NpcState>;
  for (const npcId of ALL_NPCS) {
    npcStates[npcId] = {
      mood: 0,
      currentRoom: randomized.npcStartPositions[npcId] as RoomId,
      spoken: false,
      permanentlyHostile: false,
      gaveItem: false,
      dialogueHistory: [],
    };
  }

  const puzzleStates: Record<PuzzleId, PuzzleState> = {} as Record<PuzzleId, PuzzleState>;
  for (const puzzleId of ALL_PUZZLES) {
    puzzleStates[puzzleId] = {
      status: puzzleId === "cell_wall_acrostic" ? "available" : "locked",
      attempts: 0,
      data: {},
    };
  }

  return {
    sessionId,
    participantId,
    eventId,
    currentRoom: "cell",
    previousRoom: null,
    inventory: [],
    roomStates,
    npcStates,
    puzzleStates,
    consequences: {
      alarmRaised: false,
      patrolDoubled: false,
      guardRoomLocked: false,
      nurseChenHostile: false,
      safeAttempts: 0,
      metalDetectorTriggered: false,
    },
    tunnelState: {
      currentNode: 0,
      visited: [],
      correctPath: randomized.tunnelPath,
    },
    turnNumber: 0,
    guardPatrolPosition: 0,
    isComplete: false,
    escaped: false,
    unwinnable: false,
    seed,
    randomized: {
      safeCombination: randomized.safeCombination,
      cipherShift: randomized.cipherShift,
      kitchenCode: randomized.kitchenCode,
      tunnelPath: randomized.tunnelPath,
      acrosticWord: randomized.acrosticWord,
      floatingItems: randomized.floatingItems as Record<ItemId, RoomId>,
      npcStartPositions: randomized.npcStartPositions as Record<NpcId, RoomId>,
    },
  };
}

export function serializeState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

export function getMoodLabel(moodScore: number): string {
  if (moodScore <= -7) return "hostile";
  if (moodScore <= -3) return "suspicious";
  if (moodScore <= 3) return "neutral";
  if (moodScore <= 7) return "friendly";
  return "trusting";
}

export function isUnwinnable(state: GameState): boolean {
  // Nurse Chen is permanently hostile — no medication, no Sal trust, no tunnel directions
  if (state.consequences.nurseChenHostile && !state.npcStates.old_sal.gaveItem) {
    // Unless you already have medication or Sal already trusts you
    if (!state.inventory.includes("medication") && getMoodLabel(state.npcStates.old_sal.mood) !== "trusting") {
      return true;
    }
  }

  // Guard room locked + no tunnel map + no tunnel directions from Sal
  if (state.consequences.guardRoomLocked) {
    if (!state.inventory.includes("tunnel_map") && !state.puzzleStates.tunnel_navigation.data.hasDirections) {
      return true;
    }
  }

  return false;
}
