export const MAX_TURNS = 120;
export const RATE_LIMIT_MS = 8000;
export const WAIT_COMMAND_DELAY_MS = 15000;
export const WAIT_TURN_ADVANCE = 5;
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
export const PUZZLE_COOLDOWN_TURNS = 2;

// NPC Schedule Windows
// Padre: available in windows of 10 turns every 15 turns (turns 1-10, 15-25, 30-40, ...)
export const PADRE_SCHEDULE_CYCLE = 15;
export const PADRE_SCHEDULE_WINDOW = 10;

// Nurse Chen: available during specific turn ranges
export const NURSE_CHEN_WINDOWS: [number, number][] = [
  [10, 30],
  [50, 70],
  [90, 110],
];

// Old Sal: sleeping period where he won't talk
export const SAL_SLEEPING_WINDOW: [number, number] = [40, 55];

// Guard Marcus: break periods where he's in guard_room and can be bribed
export const MARCUS_BREAK_WINDOWS: [number, number][] = [
  [20, 35],
  [60, 75],
];

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
