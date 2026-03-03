import { createHmac } from "crypto";
import type { ItemId, RoomId, NpcId } from "./types";

/**
 * Seeded PRNG using a simple mulberry32 algorithm.
 * Seed is derived from HMAC-SHA256(participantId + eventId).
 */
export function createSeed(participantId: string, eventId: string): number {
  const hmac = createHmac("sha256", "prison-escape-seed")
    .update(`${participantId}:${eventId}`)
    .digest();
  // Use first 4 bytes as 32-bit unsigned integer
  return hmac.readUInt32BE(0);
}

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomizedValues {
  safeCombination: string;
  cipherShift: number;
  kitchenCode: string;
  tunnelPath: number[];
  acrosticWord: string;
  floatingItems: Record<string, RoomId>;
  npcStartPositions: Record<string, RoomId>;
}

export function generateRandomizedValues(seed: number): RandomizedValues {
  const rng = mulberry32(seed);

  // Safe combination: 3 digits, each 0-9
  const safeCombination = [
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
  ].join("-");

  // Caesar cipher shift: 1-25
  const cipherShift = Math.floor(rng() * 25) + 1;

  // Kitchen locker code: 4 digits
  // d1-d2 from cipher, d3 = chapel window crosses (always 7), d4 from tray
  const kitchenCode = [
    Math.floor(rng() * 10),
    Math.floor(rng() * 10),
    7, // chapel window crosses — always 7
    Math.floor(rng() * 10),
  ].join("");

  // Tunnel path: sequence of 5 branch choices (0, 1, or 2 for left/straight/right)
  const tunnelPath = Array.from({ length: 5 }, () => Math.floor(rng() * 3));

  // Acrostic word is always LAUNDRY (fixed, but embedding pattern varies)
  const acrosticWord = "LAUNDRY";

  // Floating items: 5 items that can be placed in various rooms
  const floatingRooms: RoomId[] = [
    "cell",
    "yard",
    "mess_hall",
    "laundry",
    "corridor_a",
    "library",
    "chapel",
    "infirmary",
  ];
  const floatingItemIds: ItemId[] = ["note", "shiv", "bedsheet_rope"];
  const floatingItems: Record<string, RoomId> = {};
  for (const itemId of floatingItemIds) {
    const roomIdx = Math.floor(rng() * floatingRooms.length);
    floatingItems[itemId] = floatingRooms[roomIdx];
  }

  // NPC start positions (Sal can start in mess_hall or yard)
  const salStart: RoomId = rng() > 0.5 ? "mess_hall" : "yard";
  const npcStartPositions: Record<string, RoomId> = {
    old_sal: salStart,
    guard_marcus: "corridor_a",
    nurse_chen: "infirmary",
    padre: "chapel",
  };

  return {
    safeCombination,
    cipherShift,
    kitchenCode,
    tunnelPath,
    acrosticWord,
    floatingItems: floatingItems as Record<ItemId, RoomId>,
    npcStartPositions: npcStartPositions as Record<NpcId, RoomId>,
  };
}
