export const MAX_TURNS = 120;
export const RATE_LIMIT_MS = 3000;
export const INVENTORY_LIMIT = 6;
export const GUARD_PATROL_INTERVAL = 8;
export const GUARD_PATROL_DOUBLED_INTERVAL = 4;
export const SAL_MOVEMENT_INTERVAL = 10;
export const PADRE_LEAVE_DURATION = 20;
export const SAFE_MAX_ATTEMPTS = 3;
export const BRIBE_GUARD_DURATION = 16;
export const UNWINNABLE_HINT_DELAY = 20;
export const COMMAND_MAX_LENGTH = 200;
export const RESPONSE_LOG_MAX_LENGTH = 500;
export const CHALLENGE_ID_SORT_ORDER = 20;

export const FREE_COMMANDS = new Set([
  "help",
  "inventory",
  "look",
  "examine",
  "read",
  "listen",
  "smell",
  "close",
]);

export const VERB_ALIASES: Record<string, string> = {
  // Movement
  n: "go north",
  s: "go south",
  e: "go east",
  w: "go west",
  north: "go north",
  south: "go south",
  east: "go east",
  west: "go west",
  up: "go up",
  down: "go down",
  left: "go left",
  right: "go right",
  straight: "go straight",
  back: "go back",
  move: "go",
  walk: "go",
  run: "go",
  climb: "go",
  // Looking
  l: "look",
  look: "look",
  // Examining
  inspect: "examine",
  check: "examine",
  study: "examine",
  observe: "examine",
  // Taking
  get: "take",
  grab: "take",
  pick: "take",
  pickup: "take",
  // Inventory
  i: "inventory",
  inv: "inventory",
  items: "inventory",
  // Talking
  speak: "talk",
  chat: "talk",
  say: "talk",
  // Searching
  look_around: "search",
  rummage: "search",
  // Using
  apply: "use",
  activate: "use",
  // Reading
  peruse: "read",
  // Giving
  hand: "give",
  offer: "give",
  // Other
  yell: "threaten",
  shout: "threaten",
  compliment: "flatter",
  praise: "flatter",
  murmur: "whisper",
  pray: "confess",
  hit: "threaten",
  attack: "threaten",
  punch: "threaten",
  kick: "threaten",
  flip: "turn",
  unlock: "open",
};
