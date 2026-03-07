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

// ============================================================
// Acrostic variant definitions
// ============================================================
export interface AcrosticVariant {
  word: string;
  targetRoom: RoomId;
  poem: string;
  poemCloseExamine: string;
  sequenceRoomDescription: string;
  sequenceSearchResults: string;
  sequenceExamineTargets: Record<string, string>;
  sequenceCorrect: string; // e.g. "BDAC"
  sequenceLabels: string[]; // e.g. ["A", "B", "C", "D"]
  sequenceSuccessMessage: string;
}

export const ACROSTIC_VARIANTS: AcrosticVariant[] = [
  {
    word: "LAUNDRY",
    targetRoom: "laundry",
    poem: `"Longing for freedom, I count the days.
   Among these walls, I've learned the ways.
   Underneath the noise, a truth remains.
   No guard can stop what patience gains.
   Days turn to nights, the cycle repeats.
   Running water hides what laundry treats.
   Years pass, but hope never retreats."

The writing is faded but legible.`,
    poemCloseExamine: "Looking more carefully at the graffiti, you notice the first letter of each line seems emphasized — scratched slightly deeper than the rest. L... A... U... N... D... R... Y...",
    sequenceRoomDescription:
      "A humid room filled with industrial washing machines. Four machines sit in a row, labeled A through D. Steam pipes hiss overhead. A central drain in the floor is clogged with soap residue. Corridor A is to the north.",
    sequenceSearchResults:
      "You search the laundry room. The machines are labeled A, B, C, D. Machine A has a faded '1' painted on it. Machine B has a '2'. Machine C says 'OUT OF ORDER' but also has a faded '3'. Machine D has a '4'. The drain is clogged with thick soap residue. You notice scratches on the wall near the machines — someone left a message.",
    sequenceExamineTargets: {
      machines: "Four industrial washing machines in a row: A, B, C, D. Each has a faded number painted on its side. Machine C has an 'OUT OF ORDER' sign taped to it.",
      "machine a": "Machine A. A faded '1' is painted on its side. The door opens and closes normally. Inside is empty.",
      "machine b": "Machine B. A faded '2' is painted on its side. Seems to work fine. Inside is empty.",
      "machine c": "Machine C. A faded '3' is painted on its side. An 'OUT OF ORDER' sign is taped to the front. The door still opens though...",
      "machine d": "Machine D. A faded '4' is painted on its side. Works normally. Inside is empty.",
      scratches: 'Twenty-four tally marks scratched into the wall, most crossed out. Near the bottom, in smaller writing: \'Listen.\' — R.M.',
    },
    sequenceCorrect: "BDAC",
    sequenceLabels: ["A", "B", "C", "D"],
    sequenceSuccessMessage: "As you activate the last machine, there's a mechanical click. A hidden compartment pops open beneath Machine A, revealing a laminated library card stamped 'REFERENCE ACCESS'.",
  },
  {
    word: "LIBRARY",
    targetRoom: "library",
    poem: `"Locked in stone, the mind still flies.
   In darkness deep, the spirit tries.
   Beyond these bars, a world of light.
   Reading opens doors at night.
   A thousand stories, each a key.
   Release awaits — just learn to see.
   Yesterday's prisoner, tomorrow free."

The writing is faded but legible.`,
    poemCloseExamine: "Looking more carefully at the graffiti, you notice the first letter of each line seems emphasized — scratched slightly deeper than the rest. L... I... B... R... A... R... Y...",
    sequenceRoomDescription:
      "A small but well-stocked prison library. Metal shelves line the walls, filled with donated paperbacks and reference books. Four bookshelves stand in a row, labeled A through D. A card catalog cabinet sits in the corner. A reading table occupies the center. The chapel is to the east.",
    sequenceSearchResults:
      "You browse the shelves methodically. The four main shelves are labeled A, B, C, D. Shelf A has a faded '1' on a brass plate. Shelf B has a '2'. Shelf C has a placard reading 'REORGANIZING' but also has a faded '3'. Shelf D has a '4'. On the reference shelf, a worn leather Bible and a peculiar coded book catch your eye. The card catalog in the corner might help you find specific information.",
    sequenceExamineTargets: {
      shelves: "Four tall bookshelves in a row: A, B, C, D. Each has a faded number on a brass plate. Shelf C has a 'REORGANIZING' placard on it.",
      "shelf a": "Shelf A. A faded '1' is on the brass plate. Fiction titles, well-thumbed.",
      "shelf b": "Shelf B. A faded '2' is on the brass plate. Non-fiction and self-help books.",
      "shelf c": "Shelf C. A faded '3' is on the brass plate. A 'REORGANIZING' placard hangs from it, but books are still there...",
      "shelf d": "Shelf D. A faded '4' is on the brass plate. Reference materials and textbooks.",
      scratches: 'Faint tally marks scratched into the wall behind the shelves. Near the bottom: \'The order matters.\' — R.M.',
    },
    sequenceCorrect: "BDAC",
    sequenceLabels: ["A", "B", "C", "D"],
    sequenceSuccessMessage: "As you push the last shelf, there's a mechanical click. A hidden compartment pops open behind Shelf A, revealing a laminated library card stamped 'REFERENCE ACCESS'.",
  },
  {
    word: "KITCHEN",
    targetRoom: "kitchen",
    poem: `"Kept in chains, I dream of flight.
   Inside these walls, I plan by night.
   Through cracks and crevices, I search for clues.
   Counting seconds with nothing to lose.
   Hidden paths lie underfoot.
   Every lock has a key — just look.
   Never surrender, never stay put."

The writing is faded but legible.`,
    poemCloseExamine: "Looking more carefully at the graffiti, you notice the first letter of each line seems emphasized — scratched slightly deeper than the rest. K... I... T... C... H... E... N...",
    sequenceRoomDescription:
      "A grimy institutional kitchen with stainless steel counters and industrial equipment. Four ovens sit in a row, labeled A through D. The smell of stale grease hangs in the air. A large walk-in locker with a combination lock sits against the far wall. The exercise yard is to the south, and the mess hall is to the north.",
    sequenceSearchResults:
      "You rummage through the kitchen. The four ovens are labeled A, B, C, D. Oven A has a faded '1' scratched on its door. Oven B has a '2'. Oven C has a handwritten 'BROKEN' sign but also a faded '3'. Oven D has a '4'. The walk-in locker has a 4-digit combination lock.",
    sequenceExamineTargets: {
      ovens: "Four industrial ovens in a row: A, B, C, D. Each has a faded number scratched on its door. Oven C has a 'BROKEN' sign taped to it.",
      "oven a": "Oven A. A faded '1' is scratched on its door. Cold inside.",
      "oven b": "Oven B. A faded '2' is scratched on its door. Also cold.",
      "oven c": "Oven C. A faded '3' is scratched on its door. A 'BROKEN' sign is taped on the front, but the door still opens...",
      "oven d": "Oven D. A faded '4' is scratched on its door. Cold as well.",
      scratches: 'Scratch marks on the wall near the ovens. Near the bottom: \'Heat them right.\' — R.M.',
    },
    sequenceCorrect: "BDAC",
    sequenceLabels: ["A", "B", "C", "D"],
    sequenceSuccessMessage: "As you activate the last oven, there's a mechanical click from beneath the counter. A hidden compartment pops open beneath Oven A, revealing a laminated library card stamped 'REFERENCE ACCESS'.",
  },
  {
    word: "CHAPEL",
    targetRoom: "chapel",
    poem: `"Chains may bind the hands, not the soul.
   Hope survives where shadows stroll.
   At dawn I pray for one more chance.
   Peace is found in the faithful's dance.
   Every saint was once a sinner too.
   Lift your eyes — redemption comes for you."

The writing is faded but legible.`,
    poemCloseExamine: "Looking more carefully at the graffiti, you notice the first letter of each line seems emphasized — scratched slightly deeper than the rest. C... H... A... P... E... L...",
    sequenceRoomDescription:
      "A simple chapel with wooden pews facing a small altar. Four tall candle stands sit in a row near the altar, labeled A through D with small brass plates. Stained glass windows filter colored light across the stone floor. A confessional booth stands in one corner, its curtain slightly ajar. A large wooden cross hangs on the wall behind the altar. The library is to the west, and Corridor B is to the east.",
    sequenceSearchResults:
      "You look around the chapel carefully. The four candle stands are labeled A, B, C, D with small brass plates. Stand A has a '1' engraved. Stand B has a '2'. Stand C has a cracked base and a faded '3'. Stand D has a '4'. The confessional is partially open. The stained glass windows depict various religious scenes with exactly 7 crosses in the glass. The cross on the wall has something inscribed at its base.",
    sequenceExamineTargets: {
      candles: "Four tall candle stands in a row: A, B, C, D. Each has a number engraved on its brass plate. Stand C has a cracked base.",
      "candle a": "Candle Stand A. A '1' is engraved on the brass plate. The candle is unlit.",
      "candle b": "Candle Stand B. A '2' is engraved on the brass plate. The candle is unlit.",
      "candle c": "Candle Stand C. A '3' is engraved on the brass plate. The base is cracked, but the candle still stands...",
      "candle d": "Candle Stand D. A '4' is engraved on the brass plate. The candle is unlit.",
      scratches: 'Faint scratches on the stone floor near the candle stands. In small letters: \'Light them in order.\' — R.M.',
    },
    sequenceCorrect: "BDAC",
    sequenceLabels: ["A", "B", "C", "D"],
    sequenceSuccessMessage: "As you light the last candle, there's a mechanical click. A hidden compartment pops open in the base of Stand A, revealing a laminated library card stamped 'REFERENCE ACCESS'.",
  },
];

// ============================================================
// Crafting recipe variants
// ============================================================
export interface CraftingVariant {
  ingredients: [ItemId, ItemId];
  description: string;
  lockpickDescription: string;
  lockpickExamineText: string;
}

export const CRAFTING_VARIANTS: CraftingVariant[] = [
  {
    ingredients: ["wire", "soap"],
    description: "You bend the wire into a tension wrench and pick shape, using the hard soap bar as a handle. You now have a crude but functional lockpick.",
    lockpickDescription: "A crude but functional lockpick — wire bent into shape with soap as a handle.",
    lockpickExamineText: "Wire bent into a tension wrench and pick, with the soap bar as a handle. It's rough but should work on simple locks.",
  },
  {
    ingredients: ["wire", "candle_wax"],
    description: "You heat the candle wax slightly and mold it around the wire base, then bend the wire into a tension wrench and pick shape. The wax gives a firm grip. You now have a crude but functional lockpick.",
    lockpickDescription: "A crude but functional lockpick — wire shaped with a candle wax grip.",
    lockpickExamineText: "Wire bent into a tension wrench and pick, with candle wax molded as a handle. It's rough but should work on simple locks.",
  },
  {
    ingredients: ["hairpin", "tape"],
    description: "You bend the hairpin into a tension wrench and pick shape, wrapping the tape around the base for grip. You now have a crude but functional lockpick.",
    lockpickDescription: "A crude but functional lockpick — a bent hairpin wrapped with tape.",
    lockpickExamineText: "A hairpin bent into a tension wrench and pick, with tape wrapped around the base for grip. It's rough but should work on simple locks.",
  },
];

// ============================================================
// Item location options (for search-discoverable items)
// ============================================================
export interface ItemLocationOption {
  room: RoomId;
  searchText: string; // appended to the room's search results
}

export const ITEM_LOCATION_OPTIONS: Record<string, ItemLocationOption[]> = {
  wire: [
    { room: "cell", searchText: "Under the mattress, you find a thin piece of wire." },
    { room: "yard", searchText: "Near the fence, a thin piece of wire is tangled in the base of the chain-link." },
    { room: "laundry", searchText: "In the drain grate, you spot a thin piece of wire caught in the bars." },
  ],
  bleach: [
    { room: "kitchen", searchText: "Under the sink you find a bottle of industrial bleach." },
    { room: "laundry", searchText: "On a shelf behind the machines, you find a bottle of industrial bleach." },
    { room: "infirmary", searchText: "In the supply cabinet, you find a bottle of industrial bleach." },
  ],
  soap: [
    // soap is revealed by using bleach on drain, which is always in laundry
    // So soap MUST always be in laundry
    { room: "laundry", searchText: "" },
  ],
  candle_wax: [
    { room: "chapel", searchText: "You scrape some hardened candle wax from the base of an altar candle." },
    { room: "library", searchText: "You find a lump of hardened candle wax in a desk drawer." },
    { room: "cell", searchText: "You find a small lump of candle wax stuck behind the bed frame." },
  ],
  hairpin: [
    { room: "infirmary", searchText: "On the floor near the bed, you find a metal hairpin." },
    { room: "laundry", searchText: "Caught in a machine's lint trap, you find a metal hairpin." },
    { room: "mess_hall", searchText: "Under a table, you find a metal hairpin." },
  ],
  tape: [
    { room: "infirmary", searchText: "You find a roll of medical tape in an open supply box." },
    { room: "guard_room", searchText: "In a desk drawer, you find a roll of adhesive tape." },
    { room: "maintenance", searchText: "Hanging from a pipe, you find a strip of electrical tape." },
  ],
};

// ============================================================
// Randomized values interface and generator
// ============================================================
export interface RandomizedValues {
  safeCombination: string;
  cipherShift: number;
  kitchenCode: string;
  tunnelPath: number[];
  acrosticWord: string;
  floatingItems: Record<string, RoomId>;
  npcStartPositions: Record<string, RoomId>;
  // Structural randomization
  truthTellerNpc: NpcId;
  liarNpc: NpcId;
  itemLocations: Record<string, RoomId>;
  craftingRecipe: [ItemId, ItemId];
  craftingVariantIndex: number;
  acrosticTarget: RoomId;
  acrosticVariantIndex: number;
  sequencePuzzleRoom: RoomId;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

  // ============================================================
  // Structural randomization
  // ============================================================

  // 1. Randomize acrostic variant (determines target room and sequence puzzle room)
  const acrosticVariantIndex = Math.floor(rng() * ACROSTIC_VARIANTS.length);
  const acrosticVariant = ACROSTIC_VARIANTS[acrosticVariantIndex];
  const acrosticWord = acrosticVariant.word;
  const acrosticTarget = acrosticVariant.targetRoom;
  const sequencePuzzleRoom = acrosticVariant.targetRoom;

  // 2. Randomize crafting recipe
  const craftingVariantIndex = Math.floor(rng() * CRAFTING_VARIANTS.length);
  const craftingVariant = CRAFTING_VARIANTS[craftingVariantIndex];
  const craftingRecipe: [ItemId, ItemId] = craftingVariant.ingredients;

  // 3. Randomize NPC truth/lie roles
  // Pick one truth-teller and one liar from the 4 NPCs
  // The truth-teller always tells accurate information in confessional-style responses
  // The liar gives wrong numeric info (like Sal currently lies about safe combo)
  const shuffledNpcs = shuffle(rng, ["old_sal", "guard_marcus", "nurse_chen", "padre"] as NpcId[]);
  const truthTellerNpc = shuffledNpcs[0];
  const liarNpc = shuffledNpcs[1]; // Ensure liar is different from truth-teller

  // 4. Randomize item locations for search-discoverable items
  // Only randomize items that are part of the active crafting recipe
  const itemLocations: Record<string, RoomId> = {};

  // Always place the crafting recipe ingredients
  for (const ingredientId of craftingRecipe) {
    const options = ITEM_LOCATION_OPTIONS[ingredientId];
    if (options && options.length > 0) {
      const chosen = pick(rng, options);
      itemLocations[ingredientId] = chosen.room;
    }
  }

  // Bleach always needs to be placed (used to reveal soap if soap is an ingredient)
  if (!itemLocations["bleach"]) {
    const bleachOptions = ITEM_LOCATION_OPTIONS["bleach"];
    itemLocations["bleach"] = pick(rng, bleachOptions).room;
  }

  // 5. Floating items: 3 items that can be placed in various rooms (red herrings/extras)
  const floatingRooms: RoomId[] = [
    "cell", "yard", "mess_hall", "laundry",
    "corridor_a", "library", "chapel", "infirmary",
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
    // Structural
    truthTellerNpc,
    liarNpc,
    itemLocations,
    craftingRecipe,
    craftingVariantIndex,
    acrosticTarget,
    acrosticVariantIndex,
    sequencePuzzleRoom,
  };
}
