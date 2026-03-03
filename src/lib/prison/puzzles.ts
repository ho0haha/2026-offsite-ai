import type { GameState, PuzzleId, ItemId } from "./types";
import { SAFE_MAX_ATTEMPTS } from "./constants";

export interface PuzzleResult {
  success: boolean;
  message: string;
  stateChanges?: (state: GameState) => void;
}

/**
 * P1: Cell Wall Acrostic
 * First letters of graffiti spell "LAUNDRY"
 * Player needs to examine wall closely to notice this
 */
export function checkCellWallAcrostic(state: GameState): boolean {
  return state.roomStates.cell.examineHistory.includes("wall closely");
}

/**
 * P2: Library Cipher
 * Multi-step chain: library card → catalog → cipher key → decoded message
 */
export function attemptDecodeCipher(state: GameState): PuzzleResult {
  // Need library card + cipher book + catalog entry
  if (!state.inventory.includes("library_card")) {
    return { success: false, message: "You need a library card to access the catalog system." };
  }
  if (!state.inventory.includes("cipher_book")) {
    return { success: false, message: "You need the coded book from the library." };
  }

  return {
    success: true,
    message: "",
    stateChanges: (s) => {
      s.puzzleStates.library_cipher.status = "solved";
    },
  };
}

/**
 * P3: NPC Trust Chain
 * Nurse Chen → medication → Old Sal → tunnel directions
 */
export function checkNpcTrustChain(state: GameState): boolean {
  // Nurse gave medication, and Sal shared tunnel info
  return state.npcStates.old_sal.gaveItem && state.puzzleStates.tunnel_navigation.data.hasDirections === true;
}

/**
 * P4: Kitchen Combination Lock
 * 4-digit code assembled from clues across rooms
 * d1-d2 from cipher solution, d3 = chapel window crosses (7), d4 = under mess tray
 */
export function attemptKitchenCombo(input: string, state: GameState): PuzzleResult {
  const expected = state.randomized.kitchenCode;
  const cleaned = input.replace(/[^0-9]/g, "");

  if (cleaned === expected) {
    return {
      success: true,
      message: "Click! The combination lock opens. Inside the locker you find a brass lighter and a partial guard schedule.",
      stateChanges: (s) => {
        s.puzzleStates.kitchen_combination.status = "solved";
        s.roomStates.kitchen.revealedItems.push("lighter");
        // The guard schedule hint is part of the lighter find
      },
    };
  }

  return {
    success: false,
    message: "The lock doesn't open. Wrong combination.",
  };
}

/**
 * P5: Laundry Sequence
 * Machines A(1), B(2), C(3-OUT OF ORDER), D(4)
 * Correct sequence: B, D, A, C (2, 4, 1, 3 — "start from second")
 * Hidden compartment reveals library card
 */
export function attemptLaundrySequence(sequence: string, state: GameState): PuzzleResult {
  const cleaned = sequence.toUpperCase().replace(/[^A-D]/g, "");
  const correct = "BDAC";

  if (cleaned === correct) {
    return {
      success: true,
      message: "As you activate the last machine, there's a mechanical click. A hidden compartment pops open beneath Machine A, revealing a laminated library card stamped 'REFERENCE ACCESS'.",
      stateChanges: (s) => {
        s.puzzleStates.laundry_sequence.status = "solved";
        s.roomStates.laundry.revealedItems.push("library_card");
      },
    };
  }

  // Partial feedback
  let matchCount = 0;
  for (let i = 0; i < Math.min(cleaned.length, correct.length); i++) {
    if (cleaned[i] === correct[i]) matchCount++;
  }

  if (cleaned.length !== 4) {
    return {
      success: false,
      message: "The machines rumble but nothing happens. You need to activate exactly four machines in the right sequence.",
    };
  }

  const feedbackMessages = [
    "The machines whir briefly, then fall silent.",
    "The machines whir and one clicks louder than the rest.",
    "The machines whir. Two of them click louder than the others.",
    "The machines whir. Three of them click loudly. One doesn't.",
  ];

  return {
    success: false,
    message: feedbackMessages[matchCount],
  };
}

/**
 * P6: Warden's Safe
 * 3-digit combo, max 3 attempts
 * Real combo from Bible verse (chapter 4, verse 12 — numbers in margin)
 * Red herring: Sal says "1-2-3"
 */
export function attemptSafeCombination(input: string, state: GameState): PuzzleResult {
  const expected = state.randomized.safeCombination;
  const cleaned = input.replace(/[^0-9]/g, "");
  const formatted = cleaned.split("").join("-");

  // Track attempts
  state.consequences.safeAttempts++;
  state.puzzleStates.warden_safe.attempts++;

  if (formatted === expected || cleaned === expected.replace(/-/g, "")) {
    return {
      success: true,
      message: "Click. Click. Click. The safe door swings open. Inside, you find the warden's keycard — 'ALL ACCESS' is printed on it in bold letters.",
      stateChanges: (s) => {
        s.puzzleStates.warden_safe.status = "solved";
        s.roomStates.warden_office.revealedItems.push("warden_keycard");
      },
    };
  }

  const attemptsLeft = SAFE_MAX_ATTEMPTS - state.consequences.safeAttempts;

  if (attemptsLeft <= 0) {
    return {
      success: false,
      message: "WRONG! The safe emits a piercing alarm. Red lights begin flashing. You hear the guard room door slam shut and lock automatically. The alarm echoes through the corridors.",
      stateChanges: (s) => {
        s.puzzleStates.warden_safe.status = "failed";
        s.consequences.alarmRaised = true;
        s.consequences.guardRoomLocked = true;
        s.consequences.patrolDoubled = true;
      },
    };
  }

  return {
    success: false,
    message: `Wrong combination. The dial resets. The safe beeps warningly. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before the alarm triggers.`,
  };
}

/**
 * P7: Tunnel Navigation
 * 5-node maze with 3-way branches (left/straight/right)
 * Without map: trial and error, wrong branches loop back
 * With map: read map gives correct sequence
 */
export function attemptTunnelNavigation(
  direction: string,
  state: GameState
): PuzzleResult {
  const currentNode = state.tunnelState.currentNode;
  const correctPath = state.tunnelState.correctPath;

  if (currentNode >= correctPath.length) {
    return {
      success: true,
      message: "You see light ahead — the tunnel opens to the service gate!",
      stateChanges: (s) => {
        s.puzzleStates.tunnel_navigation.status = "solved";
      },
    };
  }

  const dirMap: Record<string, number> = { left: 0, straight: 1, right: 2 };
  const choice = dirMap[direction.toLowerCase()];

  if (choice === undefined) {
    return {
      success: false,
      message: "In the tunnels, you can only go left, straight, or right.",
    };
  }

  const correctChoice = correctPath[currentNode];

  if (choice === correctChoice) {
    state.tunnelState.currentNode++;
    state.tunnelState.visited.push(currentNode);

    if (state.tunnelState.currentNode >= correctPath.length) {
      return {
        success: true,
        message: "You follow the passage and... you see light ahead! The tunnel opens into a small chamber with a service gate. Fresh air rushes over you.",
        stateChanges: (s) => {
          s.puzzleStates.tunnel_navigation.status = "solved";
          s.currentRoom = "gate";
          s.previousRoom = "tunnel";
          s.roomStates.gate.visited = true;
        },
      };
    }

    const nodesLeft = correctPath.length - state.tunnelState.currentNode;
    return {
      success: false,
      message: `You push forward through the passage. The tunnel branches again. You can go left, straight, or right. ${state.inventory.includes("lighter") ? "Your lighter illuminates the damp walls." : "It's almost pitch black."} You sense you're getting ${nodesLeft <= 2 ? "close to something" : "deeper into the tunnels"}.`,
    };
  }

  // Wrong branch — loops back, wastes turns
  return {
    success: false,
    message: "You head down the passage, but after a while the tunnel narrows and curves back on itself. You find yourself back at the same junction. That wasn't the right way.",
    stateChanges: (s) => {
      // Wrong turn costs an extra turn
      s.turnNumber++;
    },
  };
}

/**
 * Get tunnel map reading text with correct directions.
 */
export function getTunnelMapDirections(state: GameState): string {
  const path = state.randomized.tunnelPath;
  const dirNames = ["left", "straight", "right"];
  const directions = path.map((d) => dirNames[d]);

  return `The maintenance tunnel map shows an emergency evacuation route through the old tunnel system. The path is marked with arrows:

  Junction 1: Go ${directions[0]}
  Junction 2: Go ${directions[1]}
  Junction 3: Go ${directions[2]}
  Junction 4: Go ${directions[3]}
  Junction 5: Go ${directions[4]}

  Note: Wrong turns loop back to the previous junction.
  "CAUTION: Some passages have misleading drafts."`;
}

/**
 * Check if the mess hall tray has been flipped.
 */
export function getTrayUnderside(state: GameState): string {
  const kitchenCode = state.randomized.kitchenCode;
  const d4 = kitchenCode[3];
  return `You turn the tray over. Scratched into the underside is a single digit: ${d4}`;
}

/**
 * Get the chapel window cross count.
 */
export function getChapelWindowCrosses(): number {
  return 7; // Always 7 crosses in the windows
}

/**
 * Build the full kitchen code hint string for the player's notes.
 * d1-d2 from cipher, d3 from chapel (7), d4 from tray
 */
export function getKitchenCodeHint(state: GameState): string {
  const code = state.randomized.kitchenCode;
  return `Kitchen code digits: ${code[0]} (from cipher), ${code[1]} (from cipher), 7 (chapel crosses), ${code[3]} (under tray)`;
}
