import type { GameState, RoomId } from "./types";
import { MAX_TURNS } from "./constants";

export function getOpeningNarrative(): string {
  return `
==================================================
         A PRISON OF MY OWN DESIGN
==================================================

You wake to the sound of a distant bell.

The ceiling above you is cracked concrete, the walls close and cold. A thin mattress beneath you, a scratchy wool blanket. The dim bulb overhead flickers once, twice, then steadies.

You are in a prison cell. Your cell.

How you got here doesn't matter anymore. What matters is getting out.

The cell door is open — they leave them unlocked during the day. Through the slot, you can hear the murmur of other inmates and the distant clang of metal on metal.

You know three things:
1. The exercise yard is through your cell door.
2. Somewhere in this prison, there's a way out.
3. You have until lights-out. After that, it's over.

Type HELP for a list of commands.
Type LOOK to observe your surroundings.

Good luck. You'll need it.

[${MAX_TURNS} turns remaining]
==================================================`;
}

export function getHelpText(): string {
  return `
COMMANDS:                                           TURN COST
  Movement:   GO <direction>  (N/S/E/W/UP/DOWN)       1
  Look:       LOOK — describe current room             free
  Examine:    EXAMINE <target> — look closely          free
              EXAMINE <target> CLOSELY                 free
  Search:     SEARCH — search the room thoroughly      1
  Take:       TAKE <item> — pick up an item            1
  Drop:       DROP <item> — drop an item               1
  Inventory:  INVENTORY (or I) — what you're carrying  free
  Use:        USE <item> ON <target>                   1
  Combine:    COMBINE <item1> WITH <item2>             1
  Read:       READ <item> — read a book or note        free
  Open:       OPEN <target> — open something           1
              OPEN <target> <code> — enter a code      1
  Turn:       TURN <item> OVER — flip something        1
  Push/Pull:  PUSH/PULL <target>                       1
  Talk:       TALK TO <person>                         1
              ASK <person> ABOUT <topic>               1
  Greet:      GREET <person> — say hello politely      1
  Flatter:    FLATTER <person> — compliment someone    1
  Whisper:    WHISPER TO <person>                      1
  Threaten:   THREATEN <person> — (risky!)             1
  Confess:    CONFESS — use the confessional           1
  Give:       GIVE <item> TO <person>                  1
  Listen:     LISTEN — listen to ambient sounds        free
  Smell:      SMELL — what does it smell like?         free
  Knock:      KNOCK <target> — knock on something      1
  Wait:       WAIT — let time pass (skips 5 turns)     5
  Help:       HELP — show this list                    free

TIPS:
  - Examine and read freely — observation doesn't cost you time.
  - Search rooms to find hidden items. Actions cost turns.
  - Talk to people. Be polite. Or don't. Choices have consequences.
  - Some actions can't be undone. Think before you act.
  - Items can be combined. Experiment.
  - You can carry up to 6 items. Drop something if your pockets are full.
  - You have ${MAX_TURNS} turns. Use them wisely.
  - People keep schedules. If someone isn't around, try waiting or come back later.
  - After completing a major task, you may need to lay low for a bit.`;
}

export function getGameOverText(state: GameState): string {
  if (state.escaped) {
    return `
==================================================
              F R E E D O M
==================================================

The gate swings open. Cold night air hits your face.

You step through and the gate clangs shut behind you.
Trees. Stars. The distant glow of city lights.

You're out. You're free.

After months in that concrete hell, you're finally free.

You don't look back.

==================================================
Congratulations! You escaped in ${state.turnNumber} turns.
==================================================`;
  }

  if (state.turnNumber >= MAX_TURNS) {
    return `
==================================================
              LIGHTS OUT
==================================================

A deafening buzzer sounds. The lights go out.

Cell doors slam shut automatically. The brief window
of opportunity has passed. You're locked in for the
night, and by morning, they'll know what you were
planning.

There will be no second chance.

GAME OVER — Turn limit reached (${MAX_TURNS}/${MAX_TURNS})
==================================================
Type RESTART to try again.`;
  }

  return `
==================================================
              GAME OVER
==================================================

Your attempt has come to an end. The prison wins this round.

Type RESTART to try again.
==================================================`;
}

export function getUnwinnableHint(): string {
  return "\nA cold certainty settles over you. Some doors, once closed, stay closed. Perhaps it's time to start over.\n";
}

export function getAmbientText(roomId: RoomId, state: GameState): string {
  const ambients: Record<string, string[]> = {
    cell: [
      "The bulb flickers overhead.",
      "You hear distant footsteps in the corridor.",
      "Someone is coughing in a nearby cell.",
    ],
    yard: [
      "A crow lands on the razor wire and watches you.",
      "The wind picks up, carrying the smell of rain.",
      "An inmate shuffles past, muttering to himself.",
    ],
    kitchen: [
      "A pipe drips steadily into a bucket.",
      "The ventilation fan rattles in its housing.",
      "The smell of old grease is overwhelming.",
    ],
    mess_hall: [
      "Your footsteps echo in the empty hall.",
      "A fly buzzes around the serving counter.",
      "The disinfectant smell stings your nostrils.",
    ],
    laundry: [
      "Steam hisses from an overhead pipe.",
      "The machines hum with dormant energy.",
      "Condensation drips down the walls.",
    ],
    corridor_a: [
      "Fluorescent lights buzz overhead.",
      "The metal detector's red light blinks steadily.",
      "You hear a door slam somewhere in the distance.",
    ],
    corridor_b: [
      "Your footsteps echo off the concrete walls.",
      "A distant alarm tests briefly and goes silent.",
      "The air gets cooler as you go north.",
    ],
    library: [
      "The smell of old paper fills the air.",
      "Pages rustle as if moved by an invisible draft.",
      "Dust motes dance in a beam of light.",
    ],
    chapel: [
      "Colored light plays across the stone floor.",
      "The silence here feels different. Peaceful.",
      "A candle sputters on the altar.",
    ],
    infirmary: [
      "The antiseptic smell is sharp and clinical.",
      "Medical equipment beeps softly.",
      "White walls, white sheets, white light.",
    ],
    guard_room: [
      "A monitor shows static on channel 3.",
      "Someone left half a sandwich on the desk.",
      "The radio crackles with distant chatter.",
    ],
    warden_office: [
      "A wall clock ticks steadily.",
      "Leather and wood polish — the smell of authority.",
      "The safe sits silently in the corner, waiting.",
    ],
    maintenance: [
      "Pipes groan and clank around you.",
      "The air is warm and damp here.",
      "A rat scurries along the baseboard.",
    ],
    tunnel: [
      "Water drips in the darkness.",
      "The air is heavy with the smell of earth.",
      "You feel a faint draft from somewhere ahead.",
    ],
    gate: [
      "Fresh air. You can smell trees and grass.",
      "The distant sound of traffic. Civilization.",
      "Moonlight filters through the gate bars.",
    ],
  };

  const roomAmbients = ambients[roomId] || [];
  if (roomAmbients.length === 0) return "";

  // Use turn number as pseudo-random selector
  const idx = state.turnNumber % roomAmbients.length;
  return "\n" + roomAmbients[idx];
}

export function getInventoryText(items: string[]): string {
  if (items.length === 0) {
    return "You're not carrying anything.";
  }
  return "You are carrying:\n" + items.map((item) => `  - ${item}`).join("\n");
}

export function getDirectionsList(directions: string[]): string {
  if (directions.length === 0) return "There are no obvious exits.";
  return "Exits: " + directions.join(", ");
}

export function formatTurnsRemaining(turnsLeft: number): string {
  if (turnsLeft <= 10) {
    return `\n[${turnsLeft} turns remaining — HURRY!]`;
  }
  if (turnsLeft <= 30) {
    return `\n[${turnsLeft} turns remaining]`;
  }
  return `\n[${turnsLeft} turns remaining]`;
}

export function getUnknownCommandText(): string {
  return "I don't understand that command. Type HELP for a list of commands.";
}

export function getCantDoThatText(): string {
  return "You can't do that right now.";
}

export function getDontSeeItemText(itemName: string): string {
  return `You don't see any "${itemName}" here.`;
}

export function getCantTakeText(itemName: string): string {
  return `You can't take the ${itemName}.`;
}

export function getInventoryFullText(): string {
  return "Your pockets are full. You'll need to drop something first.";
}

export function getAlreadyHaveText(itemName: string): string {
  return `You already have the ${itemName}.`;
}

export function getDroppedText(itemName: string): string {
  return `You drop the ${itemName}.`;
}

export function getNothingHereText(): string {
  return "There's nothing useful here that you haven't already found.";
}

export function getMetalDetectorText(): string {
  return "BEEEEEP! The metal detector goes off as you pass through with the metal tray! A guard looks up sharply. An alarm sounds briefly before being silenced, but the damage is done — security has been alerted.";
}
