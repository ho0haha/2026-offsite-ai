import type { RoomDefinition, RoomId, Direction, GameState } from "./types";

// Room map:
//                       [gate] <- FINAL EXIT
//                         |
//                      [tunnel]
//                         |
//                   [maintenance]---[guard_room]
//                         |              |
//       [chapel]---[corridor_b]---[warden_office]
//          |              |
//      [library]   [corridor_a]---[infirmary]
//                      |    |
//               [mess_hall] [laundry]
//                   |
//               [kitchen]
//                   |
//                [yard]
//                   |
//                [cell] <- START

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  cell: {
    id: "cell",
    name: "Your Cell",
    descriptions: {
      default:
        "A cramped concrete cell, barely six feet wide. A thin mattress sits on a metal frame bolted to the wall. The walls are covered in scratches and graffiti from previous occupants. A dim bulb flickers overhead. The cell door leads north to the exercise yard.",
      searched:
        "You've already turned this cell inside out. The graffiti on the wall still catches your eye.",
    },
    connections: [
      { direction: "north", targetRoom: "yard" },
    ],
    items: ["wire"],
    npcs: [],
    searchable: true,
    searchResults: "Under the mattress, you find a thin piece of wire. The graffiti on the wall seems deliberate — someone took time writing it.",
    examineTargets: {
      wall: "The wall is covered in scratches and crude drawings. Among the mess, one section of graffiti stands out — it looks more deliberate, like a message:\n\n  \"Longing for freedom, I count the days.\n   Among these walls, I've learned the ways.\n   Underneath the noise, a truth remains.\n   No guard can stop what patience gains.\n   Days turn to nights, the cycle repeats.\n   Running water hides what laundry treats.\n   Years pass, but hope never retreats.\"\n\nThe writing is faded but legible.",
      "wall closely": "Looking more carefully at the graffiti, you notice the first letter of each line seems emphasized — scratched slightly deeper than the rest. L... A... U... N... D... R... Y...",
      mattress: "A thin, stained mattress. Something might be hidden underneath.",
      door: "A heavy steel door with a slot at eye level. It's unlocked — they leave the cells open during the day.",
      bulb: "A bare bulb behind a wire cage. It flickers intermittently.",
      graffiti: "The graffiti covers most of one wall. One section looks more deliberate than the rest — like a poem or message. Try examining the wall more closely.",
    },
  },

  yard: {
    id: "yard",
    name: "Exercise Yard",
    descriptions: {
      default:
        "A bleak concrete yard enclosed by high walls topped with razor wire. A few inmates shuffle around listlessly. The sky is a flat gray overhead. Your cell block is to the south, and the kitchen entrance is to the north.",
      fromDirection: {
        south: "You step out of your cell into the exercise yard. The open air is a relief after the cramped cell, though the high walls and razor wire remind you where you are.",
      },
    },
    connections: [
      { direction: "south", targetRoom: "cell" },
      { direction: "north", targetRoom: "kitchen" },
    ],
    items: [],
    npcs: [],
    searchable: true,
    searchResults: "You scan the yard carefully. Nothing stands out among the cracks in the concrete and the scattered gravel. A few weeds push through near the walls.",
    examineTargets: {
      walls: "Twenty-foot concrete walls topped with coils of razor wire. No climbing those.",
      wire: "The razor wire glints menacingly. Don't even think about it.",
      sky: "Flat gray clouds. No sun to track the time.",
      inmates: "A handful of inmates are milling about, none paying you much attention.",
      ground: "Cracked concrete with bits of gravel. A few weeds growing through.",
    },
  },

  kitchen: {
    id: "kitchen",
    name: "Kitchen",
    descriptions: {
      default:
        "A grimy institutional kitchen with stainless steel counters and industrial equipment. The smell of stale grease hangs in the air. A large walk-in locker with a combination lock sits against the far wall. The exercise yard is to the south, and the mess hall is to the north.",
    },
    connections: [
      { direction: "south", targetRoom: "yard" },
      { direction: "north", targetRoom: "mess_hall" },
    ],
    items: ["bleach"],
    npcs: [],
    searchable: true,
    searchResults: "You rummage through the kitchen. Under the sink you find a bottle of industrial bleach. The walk-in locker has a 4-digit combination lock.",
    examineTargets: {
      locker: "A heavy steel locker with a 4-digit combination lock. It looks like it stores valuables — maybe a lighter or other contraband confiscated from inmates.",
      lock: "A 4-digit combination lock. You'll need the code to open it.",
      counters: "Stainless steel counters, scratched and dented from years of use. Nothing useful on them.",
      sink: "A large industrial sink. There's a bottle of bleach underneath.",
      bleach: "Industrial-strength bleach. This stuff could dissolve almost anything.",
      stove: "A massive industrial stove. It's cold — not meal time.",
      equipment: "Pots, pans, ladles — all chained to the wall. Nothing you can take.",
    },
  },

  mess_hall: {
    id: "mess_hall",
    name: "Mess Hall",
    descriptions: {
      default:
        "Long metal tables and benches fill this echoing hall. Food trays are stacked at one end. The kitchen is to the south, and Corridor A extends to the north. The air smells of disinfectant.",
    },
    connections: [
      { direction: "south", targetRoom: "kitchen" },
      { direction: "north", targetRoom: "corridor_a" },
    ],
    items: ["tray"],
    npcs: [],
    searchable: true,
    searchResults: "You look around the mess hall. The tables are bolted down. The food trays at the end catch your attention — they're standard issue metal trays.",
    examineTargets: {
      tables: "Long metal tables bolted to the floor. Benches on either side. Nothing hidden on top.",
      trays: "Standard-issue metal food trays stacked in a pile. One near the bottom looks slightly different — it has something scratched on the underside.",
      tray: "A standard metal food tray. The underside might have something on it.",
      "tray closely": "Looking at the tray more carefully, you'll need to turn it over to see the underside.",
      benches: "Metal benches, welded to the table frames. Uncomfortable but indestructible.",
      floor: "Linoleum tiles, many cracked or missing. Nothing underneath.",
    },
  },

  laundry: {
    id: "laundry",
    name: "Laundry Room",
    descriptions: {
      default:
        "A humid room filled with industrial washing machines. Four machines sit in a row, labeled A through D. Steam pipes hiss overhead. A central drain in the floor is clogged with soap residue. Corridor A is to the north.",
    },
    connections: [
      { direction: "north", targetRoom: "corridor_a" },
    ],
    items: ["soap"],
    npcs: [],
    searchable: true,
    searchResults: "You search the laundry room. The machines are labeled A, B, C, D. Machine A has a faded '1' painted on it. Machine B has a '2'. Machine C says 'OUT OF ORDER' but also has a faded '3'. Machine D has a '4'. The drain is clogged with thick soap residue. You notice scratches on the wall near the machines — someone left a message.",
    examineTargets: {
      machines: "Four industrial washing machines in a row: A, B, C, D. Each has a faded number painted on its side. Machine C has an 'OUT OF ORDER' sign taped to it.",
      "machine a": "Machine A. A faded '1' is painted on its side. The door opens and closes normally. Inside is empty.",
      "machine b": "Machine B. A faded '2' is painted on its side. Seems to work fine. Inside is empty.",
      "machine c": "Machine C. A faded '3' is painted on its side. An 'OUT OF ORDER' sign is taped to the front. The door still opens though...",
      "machine d": "Machine D. A faded '4' is painted on its side. Works normally. Inside is empty.",
      drain: "A central floor drain, completely clogged with layers of hardened soap residue. Something might be trapped under all that buildup.",
      pipes: "Steam pipes running along the ceiling. Hot to the touch. Not useful.",
      "out of order": "The sign looks old and faded. Someone taped it there ages ago. The machine door still opens.",
      soap: "Thick soap residue clogging the drain. It's rock-hard — you can't get it off with your hands.",
      scratches: "Twenty-four tally marks scratched into the wall, most crossed out. Near the bottom, in smaller writing: 'Listen.' — R.M.",
    },
  },

  corridor_a: {
    id: "corridor_a",
    name: "Corridor A",
    descriptions: {
      default:
        "A long institutional corridor with fluorescent lights buzzing overhead. The walls are painted a sickly green. The mess hall is to the south. The laundry room is to the southeast. Corridor B continues to the north. The infirmary door is to the east. A metal detector arch stands in the middle of the corridor.",
      fromDirection: {
        north: "You come down from Corridor B into Corridor A. The metal detector arch stands between you and the southern exits.",
      },
    },
    connections: [
      { direction: "south", targetRoom: "mess_hall" },
      { direction: "east", targetRoom: "infirmary" },
      { direction: "north", targetRoom: "corridor_b" },
      { direction: "west", targetRoom: "laundry" },
    ],
    items: [],
    npcs: [],
    searchable: false,
    examineTargets: {
      "metal detector": "An airport-style metal detector arch. It looks active — the red light on top is blinking. Passing through with metal objects would set it off.",
      lights: "Fluorescent tubes behind plastic panels. Some flicker occasionally.",
      walls: "Institutional green paint, chipped and faded. No messages or markings of note.",
    },
  },

  corridor_b: {
    id: "corridor_b",
    name: "Corridor B",
    descriptions: {
      default:
        "The corridor continues northward, the green walls giving way to gray concrete. The chapel is to the west. The warden's office is to the east. Corridor A is to the south. A maintenance door is to the north, marked 'AUTHORIZED PERSONNEL ONLY'.",
    },
    connections: [
      { direction: "south", targetRoom: "corridor_a" },
      { direction: "west", targetRoom: "chapel" },
      { direction: "east", targetRoom: "warden_office" },
      { direction: "north", targetRoom: "maintenance", requiredItem: "warden_keycard" },
    ],
    items: [],
    npcs: [],
    searchable: false,
    examineTargets: {
      "maintenance door": "A heavy steel door marked 'AUTHORIZED PERSONNEL ONLY'. It has an electronic keycard reader beside it.",
      "keycard reader": "An electronic keycard reader with a small LED — currently red. You'd need an authorized keycard to open this.",
      walls: "The paint transitions from institutional green to bare gray concrete. More utilitarian up here.",
    },
  },

  library: {
    id: "library",
    name: "Library",
    descriptions: {
      default:
        "A small but well-stocked prison library. Metal shelves line the walls, filled with donated paperbacks and reference books. A card catalog cabinet sits in the corner, its wooden drawers worn smooth. A reading table occupies the center. The chapel is to the east.",
    },
    connections: [
      { direction: "east", targetRoom: "chapel" },
    ],
    items: ["cipher_book", "bible"],
    npcs: [],
    searchable: true,
    searchResults: "You browse the shelves methodically. Most books are dog-eared paperbacks. On the reference shelf, a worn leather Bible and a peculiar book with a coded title catch your eye. The card catalog might help you find specific information.",
    examineTargets: {
      shelves: "Metal bookshelves filled with donated books. Fiction, non-fiction, and a small reference section.",
      "card catalog": "An old wooden card catalog cabinet with dozens of tiny drawers. Each drawer is labeled alphabetically. A sign reads 'REFERENCE ACCESS REQUIRED'. You could use a library card to search it.",
      catalog: "An old wooden card catalog cabinet. A sign reads 'REFERENCE ACCESS REQUIRED'. You could use a library card to search for specific topics.",
      table: "A plain reading table with two chairs. Nothing on it.",
      books: "Rows and rows of books. You'd need to look for something specific. The card catalog might help.",
      bible: "A well-worn leather-bound Bible. It's been read many times. Some passages are underlined.",
    },
  },

  chapel: {
    id: "chapel",
    name: "Chapel",
    descriptions: {
      default:
        "A simple chapel with wooden pews facing a small altar. Stained glass windows filter colored light across the stone floor. A confessional booth stands in one corner, its curtain slightly ajar. A large wooden cross hangs on the wall behind the altar. The library is to the west, and Corridor B is to the east.",
    },
    connections: [
      { direction: "west", targetRoom: "library" },
      { direction: "east", targetRoom: "corridor_b" },
    ],
    items: ["chapel_verse_note"],
    npcs: [],
    searchable: true,
    searchResults: "You look around the chapel carefully. The confessional is partially open. The stained glass windows depict various religious scenes. The cross on the wall has something inscribed at its base.",
    examineTargets: {
      windows: "The stained glass windows depict scenes of redemption and forgiveness. You count the crosses in the window design — there are exactly 7 crosses worked into the glass.",
      window: "The stained glass windows depict scenes of redemption and forgiveness. You count the crosses in the window design — there are exactly 7 crosses.",
      cross: "A large wooden cross on the wall behind the altar. At its base, small numbers are carved: '4:12'. A Bible verse reference, perhaps? Chapter 4, verse 12.",
      "cross closely": "The carved numbers at the base of the cross read '4:12'. Definitely a Bible verse reference.",
      altar: "A simple wooden altar with a white cloth. A pair of candles, unlit.",
      pews: "Worn wooden pews, each one carved with decades of initials and idle scratching.",
      confessional: "A traditional confessional booth with a wooden frame and a heavy curtain. The curtain is slightly ajar. You could enter it.",
      booth: "The confessional booth. You could enter and confess.",
      curtain: "A heavy dark curtain on the confessional booth, slightly open.",
    },
  },

  infirmary: {
    id: "infirmary",
    name: "Infirmary",
    descriptions: {
      default:
        "A clinical room with white walls and the sharp smell of antiseptic. A single bed with a thin mattress, a medicine cabinet (locked), and a desk covered in paperwork. Corridor A is to the west.",
    },
    connections: [
      { direction: "west", targetRoom: "corridor_a" },
    ],
    items: [],
    npcs: ["nurse_chen"],
    searchable: true,
    searchResults: "You look around the infirmary. The medicine cabinet is locked — only Nurse Chen has the key. The desk has standard medical forms, nothing useful.",
    examineTargets: {
      cabinet: "A glass-fronted medicine cabinet, locked with a small key. You can see bottles of various medications inside. Nurse Chen keeps the key.",
      bed: "A narrow infirmary bed with clean white sheets. For patients only.",
      desk: "Covered in medical forms and scheduling paperwork. Nothing useful to you.",
      paperwork: "Routine medical forms. Patient schedules, medication logs. Nothing relevant.",
    },
  },

  guard_room: {
    id: "guard_room",
    name: "Guard Room",
    descriptions: {
      default:
        "A security station with monitors, a desk cluttered with coffee cups, and a gun locker (firmly locked). A schedule board hangs on the wall. The warden's office is to the south. A heavy door leads to the maintenance corridor to the west.",
    },
    connections: [
      { direction: "south", targetRoom: "warden_office" },
      { direction: "west", targetRoom: "maintenance" },
    ],
    items: ["guard_schedule", "tunnel_map"],
    npcs: [],
    searchable: true,
    searchResults: "You search the guard room quickly. On the desk, you find a guard patrol schedule. In a drawer, there's a folded maintenance tunnel map — probably for emergency evacuations.",
    examineTargets: {
      monitors: "Security monitors showing various areas of the prison. Most are grainy and hard to make out.",
      desk: "Cluttered with coffee cups, papers, and a half-eaten sandwich. A patrol schedule sits on top. Drawers might have more.",
      schedule: "A guard patrol schedule posted on the wall. It shows rotation times and routes.",
      "gun locker": "A heavy steel gun locker. Triple-locked. Don't even try.",
      locker: "A heavy steel gun locker. Triple-locked. Not happening.",
      drawers: "The desk drawers are mostly empty. One has a folded piece of paper that looks like a map.",
    },
  },

  warden_office: {
    id: "warden_office",
    name: "Warden's Office",
    descriptions: {
      default:
        "A well-appointed office with a mahogany desk, leather chair, and bookshelves. A large safe sits in the corner behind the desk. The guard room is to the north, and Corridor B is to the west. The warden is currently away — his coat is gone from the hook.",
    },
    connections: [
      { direction: "north", targetRoom: "guard_room", blockedByAlarm: true },
      { direction: "west", targetRoom: "corridor_b" },
    ],
    items: [],
    npcs: [],
    searchable: true,
    searchResults: "You search the office. The desk drawers are locked. The safe in the corner has a 3-digit combination dial. The bookshelves have legal texts and policy manuals — nothing hidden.",
    examineTargets: {
      safe: "A heavy floor safe with a 3-digit combination dial. It looks like it holds important items. You notice scratch marks around the dial — someone's tried to break in before.",
      desk: "A mahogany desk with locked drawers. A nameplate reads 'WARDEN J. HARRISON'. Nothing useful on top.",
      chair: "A comfortable leather swivel chair. The warden lives well.",
      bookshelves: "Legal texts, prison policy manuals, a few personal photos. Nothing hidden.",
      photos: "Photos of the warden with various politicians and officials. He looks pleased with himself in all of them.",
      coat: "The coat hook is empty — the warden is out.",
    },
  },

  maintenance: {
    id: "maintenance",
    name: "Maintenance Corridor",
    descriptions: {
      default:
        "A narrow utility corridor lined with pipes and electrical conduit. The air is damp and warm. Exposed bulbs cast harsh shadows. The guard room is to the east. A rusted grate in the floor leads down to the tunnel system. Corridor B is to the south.",
    },
    connections: [
      { direction: "east", targetRoom: "guard_room" },
      { direction: "south", targetRoom: "corridor_b" },
      { direction: "down", targetRoom: "tunnel" },
    ],
    items: [],
    npcs: [],
    searchable: true,
    searchResults: "You examine the maintenance corridor. The pipes are labeled with faded tags. The grate in the floor is heavy but can be lifted. It leads down into darkness.",
    examineTargets: {
      pipes: "A maze of pipes — steam, water, sewage. Labels are mostly faded.",
      grate: "A heavy iron grate in the floor. You can see darkness below. It leads to the old tunnel system. You could go down.",
      conduit: "Electrical conduit running along the walls. Don't touch.",
      bulbs: "Bare bulbs behind wire cages. Similar to your cell.",
    },
  },

  tunnel: {
    id: "tunnel",
    name: "Tunnel System",
    descriptions: {
      default:
        "You descend into a dark, damp tunnel. The air is thick with the smell of earth and old concrete. The tunnel branches ahead. Without a light source, you can barely see. The grate back to maintenance is above you.",
    },
    connections: [
      { direction: "up", targetRoom: "maintenance" },
    ],
    items: [],
    npcs: [],
    searchable: false,
    examineTargets: {
      tunnel: "The tunnel branches in multiple directions. It's disorienting down here — there's no clear north or south, just relative directions from where you stand.",
      walls: "Rough concrete and exposed earth. The tunnel was carved out long ago.",
      air: "Damp, earthy. You can feel a faint draft from somewhere ahead — that might be the way out.",
    },
  },

  gate: {
    id: "gate",
    name: "Service Gate",
    descriptions: {
      default:
        "You emerge from the tunnel into a small chamber. Before you is a service gate — an old emergency exit from the tunnel system. It has an electronic lock with a keycard reader. Beyond it, you can see the dark outline of trees and the distant glow of city lights. Freedom.",
    },
    connections: [],
    items: [],
    npcs: [],
    searchable: false,
    examineTargets: {
      gate: "A heavy steel gate with an electronic keycard reader. One swipe and you're free.",
      "keycard reader": "An electronic lock. It needs a keycard — probably the warden's.",
      trees: "Beyond the gate, trees sway in the night air. Freedom is so close you can taste it.",
    },
  },
};

/**
 * Get room description considering entry direction and state.
 */
export function getRoomDescription(
  roomId: RoomId,
  state: GameState
): string {
  const room = ROOM_DEFINITIONS[roomId];
  if (!room) return "You are nowhere.";

  const roomState = state.roomStates[roomId];

  // If the room was already visited and searched, use shorter description
  if (roomState.visited && roomState.searched && room.descriptions.searched) {
    return room.descriptions.searched;
  }

  // Check for entry-dependent description
  if (state.previousRoom && room.descriptions.fromDirection) {
    const entryDir = getEntryDirection(state.previousRoom, roomId);
    if (entryDir && room.descriptions.fromDirection[entryDir]) {
      return room.descriptions.fromDirection[entryDir]!;
    }
  }

  // Check for NPCs in the room and append their presence
  let desc = room.descriptions.default;
  const npcsHere = getNpcsInRoom(roomId, state);
  if (npcsHere.length > 0) {
    const npcDescs = npcsHere.map((npc) => npcPresenceText(npc, state));
    desc += "\n\n" + npcDescs.join("\n");
  }

  return desc;
}

function npcPresenceText(npcId: string, state: GameState): string {
  switch (npcId) {
    case "old_sal":
      return "Old Sal is here, leaning against the wall with a faraway look in his eyes.";
    case "guard_marcus":
      return "Guard Marcus is standing nearby, watching the corridor with a bored expression.";
    case "nurse_chen":
      return "Nurse Chen is at her desk, reviewing some paperwork.";
    case "padre":
      return "The Padre is here, sitting quietly in a pew with his hands folded.";
    default:
      return "";
  }
}

function getEntryDirection(fromRoom: RoomId, toRoom: RoomId): Direction | null {
  const room = ROOM_DEFINITIONS[toRoom];
  for (const conn of room.connections) {
    if (conn.targetRoom === fromRoom) {
      return conn.direction;
    }
  }
  return null;
}

export function getNpcsInRoom(roomId: RoomId, state: GameState): string[] {
  const npcs: string[] = [];
  for (const [npcId, npcState] of Object.entries(state.npcStates)) {
    if (npcState.currentRoom === roomId) {
      // Check if padre has temporarily left
      if (npcId === "padre" && npcState.leftTemporarily) {
        const turnsGone = state.turnNumber - npcState.leftTemporarily;
        if (turnsGone < 20) continue; // Padre is away
      }
      npcs.push(npcId);
    }
  }
  return npcs;
}

export function getItemsInRoom(roomId: RoomId, state: GameState): string[] {
  const room = ROOM_DEFINITIONS[roomId];
  const roomState = state.roomStates[roomId];

  // Base items minus taken items
  const baseItems = room.items.filter((id) => !roomState.itemsTaken.includes(id));

  // Add floating items assigned to this room
  const floatingHere = Object.entries(state.randomized.floatingItems)
    .filter(([, room]) => room === roomId)
    .map(([itemId]) => itemId)
    .filter((id) => !roomState.itemsTaken.includes(id as any));

  // Add revealed items
  const revealed = roomState.revealedItems.filter((id) => !roomState.itemsTaken.includes(id));

  return [...baseItems, ...floatingHere, ...revealed];
}

export function isRoomAccessible(
  fromRoom: RoomId,
  toRoom: RoomId,
  state: GameState
): { accessible: boolean; message?: string } {
  const room = ROOM_DEFINITIONS[fromRoom];
  const connection = room.connections.find((c) => c.targetRoom === toRoom);

  if (!connection) {
    return { accessible: false, message: "You can't go that way." };
  }

  if (connection.hidden && !state.roomStates[fromRoom].examineHistory.includes(connection.direction)) {
    return { accessible: false, message: "You can't go that way." };
  }

  if (connection.requiredItem && !state.inventory.includes(connection.requiredItem)) {
    if (toRoom === "maintenance") {
      return { accessible: false, message: "The maintenance door is locked. It has an electronic keycard reader — you need an authorized keycard." };
    }
    return { accessible: false, message: "You don't have what you need to go that way." };
  }

  if (connection.blockedByAlarm && state.consequences.guardRoomLocked) {
    return { accessible: false, message: "The guard room is locked down. An alarm is blaring and the door won't budge." };
  }

  // Check guard patrol blocking
  if (connection.blockedByGuard) {
    const guardRoom = state.npcStates.guard_marcus.currentRoom;
    if (guardRoom === fromRoom || guardRoom === toRoom) {
      return { accessible: false, message: "Guard Marcus is blocking the way. You'll need to wait for him to move or find another way." };
    }
  }

  return { accessible: true };
}

export function getDirectionToRoom(fromRoom: RoomId, toRoom: RoomId): Direction | null {
  const room = ROOM_DEFINITIONS[fromRoom];
  const conn = room.connections.find((c) => c.targetRoom === toRoom);
  return conn ? conn.direction : null;
}

export function getRoomByDirection(fromRoom: RoomId, direction: Direction): RoomId | null {
  const room = ROOM_DEFINITIONS[fromRoom];
  const conn = room.connections.find((c) => c.direction === direction);
  return conn ? conn.targetRoom : null;
}
