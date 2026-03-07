import type { ItemDefinition, CombineRule, ItemId, GameState } from "./types";
import { CRAFTING_VARIANTS } from "./randomizer";

export const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  wire: {
    id: "wire",
    name: "thin wire",
    aliases: ["wire", "metal wire", "piece of wire"],
    description: "A thin piece of wire, about six inches long. Flexible but strong.",
    examineText: "It's a piece of wire from a bed frame. Thin enough to bend into shapes. Could be useful for picking locks if you had something to grip it with.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },

  soap: {
    id: "soap",
    name: "bar of soap",
    aliases: ["soap", "soap bar"],
    description: "A hard bar of institutional soap freed from the drain.",
    examineText: "A dense bar of soap. Hard as a rock from being clogged in the drain. Could be used as a grip or handle for something.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "bleach_drain",
  },

  lockpick: {
    id: "lockpick",
    name: "improvised lockpick",
    aliases: ["lockpick", "pick", "lock pick"],
    description: "A crude but functional improvised lockpick.",
    examineText: "An improvised lockpick, rough but functional. It should work on simple locks.",
    takeable: true,
    weight: 1,
  },

  library_card: {
    id: "library_card",
    name: "library card",
    aliases: ["card", "library card", "lib card"],
    description: "A laminated library card with 'REFERENCE ACCESS' stamped on it.",
    examineText: "A library access card. With this, you can look up specific entries in the card catalog system. The name on it is scratched off.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "laundry_sequence",
  },

  cipher_book: {
    id: "cipher_book",
    name: "coded book",
    aliases: ["coded book", "cipher book", "strange book", "book with codes"],
    description: "A slim book with pages filled with shifted letters — some kind of cipher.",
    examineText: "The book is filled with text where every letter seems shifted. It's a Caesar cipher — each letter has been replaced by one a fixed number of positions down the alphabet. You'll need to figure out the shift value to decode it.",
    takeable: true,
    readable: true,
    readText: "The text is encoded. Without knowing the cipher shift, it's gibberish. You need to find the key — maybe the card catalog has information about ciphers.",
    weight: 1,
  },

  bible: {
    id: "bible",
    name: "Bible",
    aliases: ["bible", "holy bible", "good book", "scripture"],
    description: "A well-worn leather-bound Bible with dog-eared pages.",
    examineText: "A King James Bible, well-used. Several passages are underlined. You could read specific chapters and verses.",
    takeable: true,
    readable: true,
    weight: 1,
  },

  bleach: {
    id: "bleach",
    name: "bottle of bleach",
    aliases: ["bleach", "bleach bottle", "industrial bleach"],
    description: "A bottle of industrial-strength bleach. Caustic and powerful.",
    examineText: "Industrial cleaning bleach. WARNING: Caustic. Handle with care. This stuff could dissolve organic buildup easily.",
    takeable: true,
    usableOn: ["drain", "soap"],
    weight: 1,
  },

  medication: {
    id: "medication",
    name: "medication",
    aliases: ["medication", "medicine", "meds", "pills"],
    description: "A small bottle of prescription medication labeled for pain relief.",
    examineText: "Prescription pain medication. Nurse Chen gave this to you. Someone who's in pain might really need this.",
    takeable: true,
    weight: 1,
  },

  lighter: {
    id: "lighter",
    name: "lighter",
    aliases: ["lighter", "zippo", "light"],
    description: "A brass Zippo lighter. Confiscated contraband.",
    examineText: "A well-used brass lighter. Still has fuel. Valuable currency in prison, and useful for seeing in dark places.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "kitchen_locker",
  },

  guard_schedule: {
    id: "guard_schedule",
    name: "guard schedule",
    aliases: ["schedule", "patrol schedule", "guard rotation"],
    description: "A printed guard patrol schedule showing rotation times.",
    examineText: "A detailed patrol schedule showing when guards rotate through different areas. Could help you time your movements.",
    takeable: true,
    readable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },

  tunnel_map: {
    id: "tunnel_map",
    name: "tunnel map",
    aliases: ["map", "maintenance map", "tunnel diagram"],
    description: "A folded map of the maintenance tunnel system.",
    examineText: "A maintenance tunnel map, probably for emergency evacuations. It shows the branching paths through the tunnel system.",
    takeable: true,
    readable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },

  warden_keycard: {
    id: "warden_keycard",
    name: "warden's keycard",
    aliases: ["keycard", "warden keycard", "key card", "card"],
    description: "An electronic keycard labeled 'WARDEN - ALL ACCESS'.",
    examineText: "A high-security keycard with the warden's name. This should open any electronic lock in the facility, including the maintenance door and the service gate.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "warden_safe",
  },

  tray: {
    id: "tray",
    name: "metal tray",
    aliases: ["tray", "food tray", "metal tray"],
    description: "A standard-issue metal food tray. Heavy enough to set off a metal detector.",
    examineText: "A dented metal food tray. Turning it over might reveal something on the underside.",
    takeable: true,
    weight: 2,
  },

  shiv: {
    id: "shiv",
    name: "crude shiv",
    aliases: ["shiv", "knife", "blade", "weapon"],
    description: "A crude blade made from a sharpened piece of metal. Dangerous.",
    examineText: "A sharpened piece of metal wrapped in cloth tape. Prison-made. Having this on you is risky — guards would not be happy.",
    takeable: true,
    weight: 1,
  },

  bedsheet_rope: {
    id: "bedsheet_rope",
    name: "bedsheet rope",
    aliases: ["rope", "bedsheet", "sheet rope"],
    description: "Strips of bedsheet tied together into a crude rope.",
    examineText: "About ten feet of braided bedsheet. Not long enough to climb the yard walls, but might be useful elsewhere.",
    takeable: true,
    weight: 1,
  },

  note: {
    id: "note",
    name: "crumpled note",
    aliases: ["note", "paper", "crumpled note"],
    description: "A crumpled piece of paper with faded writing.",
    examineText: "A note in shaky handwriting: 'The padre knows the truth. Everyone else lies about something. Trust the confessional.'",
    takeable: true,
    readable: true,
    readText: "The note reads: 'The padre knows the truth. Everyone else lies about something. Trust the confessional.'",
    weight: 1,
  },

  card_catalog_entry: {
    id: "card_catalog_entry",
    name: "catalog entry",
    aliases: ["catalog entry", "catalog card", "entry"],
    description: "A card from the library catalog about ciphers.",
    examineText: "A catalog card referencing cryptography methods. It mentions that the coded book in the collection uses a Caesar cipher.",
    takeable: true,
    readable: true,
    weight: 1,
    hidden: true,
    revealedBy: "card_catalog_search",
  },

  chapel_verse_note: {
    id: "chapel_verse_note",
    name: "verse note",
    aliases: ["verse note", "verse", "chapel note"],
    description: "A note with a Bible verse reference copied from the chapel cross.",
    examineText: "You wrote down the verse reference from the chapel cross: 4:12.",
    takeable: true,
    readable: true,
    readText: "The verse reference from the cross: Chapter 4, Verse 12.",
    weight: 1,
    hidden: true,
    revealedBy: "examine_cross",
  },

  candle_wax: {
    id: "candle_wax",
    name: "lump of candle wax",
    aliases: ["candle wax", "wax", "candle"],
    description: "A solid lump of hardened candle wax.",
    examineText: "A dense lump of candle wax, hard and waxy. Could be heated and molded into a grip or handle for something.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },

  hairpin: {
    id: "hairpin",
    name: "metal hairpin",
    aliases: ["hairpin", "hair pin", "pin", "bobby pin"],
    description: "A sturdy metal hairpin. Thin but strong.",
    examineText: "A metal hairpin, about three inches long. Sturdy enough to bend into shapes. Could be useful for picking locks with some additional grip.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },

  tape: {
    id: "tape",
    name: "roll of tape",
    aliases: ["tape", "adhesive tape", "medical tape", "electrical tape"],
    description: "A small roll of adhesive tape.",
    examineText: "A roll of adhesive tape. Sticky and durable. Could be used to wrap around something for a better grip.",
    takeable: true,
    weight: 1,
    hidden: true,
    revealedBy: "search",
  },
};

export const COMBINE_RULES: CombineRule[] = [
  {
    item1: "wire",
    item2: "soap",
    result: "lockpick",
    description: "You bend the wire into a tension wrench and pick shape, using the hard soap bar as a handle. You now have a crude but functional lockpick.",
    consumeInputs: true,
  },
];

export function getItemByAlias(alias: string): ItemDefinition | null {
  const lower = alias.toLowerCase();
  for (const item of Object.values(ITEM_DEFINITIONS)) {
    if (item.id === lower || item.name.toLowerCase() === lower || item.aliases.some((a) => a.toLowerCase() === lower)) {
      return item;
    }
  }
  return null;
}

/**
 * Find a combine rule that matches the given items.
 * Uses the state's randomized crafting recipe to dynamically build the rule.
 */
export function findCombineRule(item1: ItemId, item2: ItemId, state?: GameState): CombineRule | null {
  if (state) {
    const [r1, r2] = state.randomized.craftingRecipe;
    if ((item1 === r1 && item2 === r2) || (item1 === r2 && item2 === r1)) {
      const variantIndex = (state.randomized as any).craftingVariantIndex ?? 0;
      const variant = CRAFTING_VARIANTS[variantIndex];
      return {
        item1: r1,
        item2: r2,
        result: "lockpick" as ItemId,
        description: variant.description,
        consumeInputs: true,
      };
    }
    return null;
  }
  // Fallback to static rules
  return (
    COMBINE_RULES.find(
      (r) =>
        (r.item1 === item1 && r.item2 === item2) ||
        (r.item1 === item2 && r.item2 === item1)
    ) ?? null
  );
}

/**
 * Get the read text for the Bible at a specific chapter:verse.
 * The safe combination is encoded in the verse text.
 */
export function readBibleVerse(
  chapter: number,
  verse: number,
  state: GameState
): string {
  // The key verse is 4:12, referenced by the chapel cross
  if (chapter === 4 && verse === 12) {
    const combo = state.randomized.safeCombination;
    const [d1, d2, d3] = combo.split("-");
    return `"For the word of truth is alive and active. Sharper than any two-edged sword, it penetrates even to dividing soul and spirit, joints and marrow; it judges the thoughts and attitudes of the heart." The numbers ${d1}, ${d2}, and ${d3} are underlined in the margin beside this verse.`;
  }

  // Other verses return generic text
  const genericVerses: Record<string, string> = {
    "1:1": '"In the beginning was the Word, and the Word was with God."',
    "3:16": '"For God so loved the world that he gave his one and only Son."',
    "23:4": '"Even though I walk through the valley of the shadow of death, I will fear no evil."',
  };

  const key = `${chapter}:${verse}`;
  return genericVerses[key] || `You flip to chapter ${chapter}, verse ${verse}. The text is unremarkable.`;
}

/**
 * Decode a Caesar cipher message given the shift value.
 */
export function decodeCipher(state: GameState): string {
  const shift = state.randomized.cipherShift;
  const kitchenCode = state.randomized.kitchenCode;
  const d1 = kitchenCode[0];
  const d2 = kitchenCode[1];
  return `Decoded message: "The kitchen locker opens with four numbers. The first two are ${d1} and ${d2}. Old Sal knows the way through the tunnels — but he won't share until you earn his trust. Bring him what he needs."`;
}

/**
 * Get the cipher shift key from card catalog.
 */
export function getCipherKey(state: GameState): string {
  const shift = state.randomized.cipherShift;
  return `The catalog entry on cryptography notes: "The coded book in our collection (#47-C) uses a simple Caesar cipher with a shift of ${shift}. To decode: shift each letter back by ${shift} positions in the alphabet."`;
}
