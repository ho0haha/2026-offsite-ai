import type { NpcId, NpcMood, GameState, RoomId } from "./types";
import { getMoodLabel } from "./state";
import {
  GUARD_PATROL_INTERVAL,
  GUARD_PATROL_DOUBLED_INTERVAL,
  SAL_MOVEMENT_INTERVAL,
  PADRE_LEAVE_DURATION,
  BRIBE_GUARD_DURATION,
} from "./constants";

export interface NpcInfo {
  id: NpcId;
  name: string;
  aliases: string[];
  description: string;
}

export const NPC_INFO: Record<NpcId, NpcInfo> = {
  old_sal: {
    id: "old_sal",
    name: "Old Sal",
    aliases: ["sal", "old sal", "old man", "inmate"],
    description: "A grizzled old inmate with weathered skin and sharp eyes. He's been here longer than anyone can remember.",
  },
  guard_marcus: {
    id: "guard_marcus",
    name: "Guard Marcus",
    aliases: ["marcus", "guard", "guard marcus", "officer"],
    description: "A by-the-book guard with a bored expression. He does his rounds like clockwork.",
  },
  nurse_chen: {
    id: "nurse_chen",
    name: "Nurse Chen",
    aliases: ["chen", "nurse", "nurse chen", "doctor", "doc"],
    description: "A compassionate woman in medical scrubs. She seems genuinely caring but cautious around inmates.",
  },
  padre: {
    id: "padre",
    name: "The Padre",
    aliases: ["padre", "father", "priest", "chaplain", "padre"],
    description: "A gentle-faced man in a simple cassock. He radiates calm and speaks in measured tones.",
  },
};

export function findNpcByAlias(alias: string): NpcId | null {
  const lower = alias.toLowerCase();
  for (const [id, info] of Object.entries(NPC_INFO)) {
    if (info.aliases.includes(lower) || info.name.toLowerCase() === lower) {
      return id as NpcId;
    }
  }
  return null;
}

export function getNpcGreetResponse(npcId: NpcId, state: GameState): string {
  const npcState = state.npcStates[npcId];
  const mood = getMoodLabel(npcState.mood) as NpcMood;

  switch (npcId) {
    case "old_sal":
      switch (mood) {
        case "hostile": return "Sal turns his back on you. \"Get lost.\"";
        case "suspicious": return "Sal eyes you warily. \"What do you want?\"";
        case "neutral": return "Sal nods slightly. \"Hey.\"";
        case "friendly": return "Sal gives you a crooked smile. \"Hey there. Good to see a friendly face.\"";
        case "trusting": return "Sal grins warmly. \"My friend! What can old Sal do for you?\"";
      }
      break;
    case "guard_marcus":
      switch (mood) {
        case "hostile": return "Marcus glares at you. \"Step back, inmate. Now.\"";
        case "suspicious": return "Marcus eyes you. \"Keep moving, inmate.\"";
        case "neutral": return "Marcus barely glances at you. \"What is it?\"";
        case "friendly": return "Marcus nods. \"What do you need?\"";
        case "trusting": return "Marcus leans in. \"Make it quick — I'm doing you a favor here.\"";
      }
      break;
    case "nurse_chen":
      if (npcState.permanentlyHostile) {
        return "Nurse Chen won't even look at you. \"I have nothing to say to you. Leave my infirmary.\"";
      }
      switch (mood) {
        case "hostile": return "Nurse Chen crosses her arms. \"I don't want to talk to you.\"";
        case "suspicious": return "Nurse Chen looks up cautiously. \"Can I help you with something medical?\"";
        case "neutral": return "Nurse Chen gives you a polite nod. \"Hello. Are you feeling alright?\"";
        case "friendly": return "Nurse Chen smiles warmly. \"Hello there. How are you feeling today?\"";
        case "trusting": return "Nurse Chen's face lights up. \"Oh, hello! It's good to see you. What can I do for you?\"";
      }
      break;
    case "padre":
      switch (mood) {
        case "hostile": return "The Padre is silent, his expression pained.";
        case "suspicious": return "The Padre regards you carefully. \"My child, what brings you here?\"";
        case "neutral": return "The Padre smiles gently. \"Welcome, my child. This is a place of peace.\"";
        case "friendly": return "The Padre rises to greet you. \"Ah, welcome back. I'm always happy to see you.\"";
        case "trusting": return "The Padre clasps your hand warmly. \"My friend. The Lord smiles upon you today.\"";
      }
      break;
  }
  return "";
}

export function getNpcThreatResponse(npcId: NpcId, state: GameState): { response: string; consequence?: string } {
  switch (npcId) {
    case "old_sal":
      return {
        response: "Sal's eyes go cold. \"You threatening me? I've survived thirty years in here, kid. I've got nothing to lose.\" He turns away and refuses to speak.",
      };
    case "guard_marcus":
      return {
        response: "Marcus's hand goes to his baton. \"That's a real bad idea, inmate. One more word and you're going to solitary.\" He radios for backup.",
        consequence: "alarm_raised",
      };
    case "nurse_chen":
      return {
        response: "Nurse Chen's face goes pale, then hardens. \"Get out. GET OUT! I will never help you. Guards!\" She slams the medicine cabinet shut and turns her back on you permanently.",
        consequence: "nurse_hostile",
      };
    case "padre":
      return {
        response: "The Padre looks deeply hurt. \"Violence has no place in God's house. I... I need to be alone.\" He quietly leaves the chapel, his hands trembling.",
        consequence: "padre_leaves",
      };
  }
}

export function getNpcFlatterResponse(npcId: NpcId, state: GameState): string {
  const mood = getMoodLabel(state.npcStates[npcId].mood) as NpcMood;

  switch (npcId) {
    case "old_sal":
      return mood === "hostile"
        ? "Sal scoffs. \"Save your sweet talk.\""
        : "Sal chuckles. \"You've got a silver tongue, kid. Reminds me of myself when I was young.\"";
    case "guard_marcus":
      return "Marcus looks uncomfortable. \"I don't need compliments. I need inmates who follow rules.\"";
    case "nurse_chen":
      return state.npcStates.nurse_chen.permanentlyHostile
        ? "Nurse Chen ignores you completely."
        : "Nurse Chen blushes slightly. \"That's... very kind of you. Thank you.\"";
    case "padre":
      return "The Padre waves his hand modestly. \"All glory belongs to God, not to me. But I appreciate the kindness.\"";
  }
}

export function getNpcWhisperResponse(npcId: NpcId, state: GameState): string {
  const mood = getMoodLabel(state.npcStates[npcId].mood) as NpcMood;

  switch (npcId) {
    case "old_sal":
      if (mood === "hostile" || mood === "suspicious") {
        return "Sal leans away. \"I don't do whispers with strangers.\"";
      }
      if (mood === "trusting") {
        return "Sal leans in close. \"Listen kid, I know the tunnels. Bring me what I need and I'll tell you the way out. I'm in pain — real bad. The nurse has medication that helps.\"";
      }
      return "Sal cocks his head. \"You want to whisper, you gotta earn my trust first.\"";
    case "guard_marcus":
      return "Marcus frowns. \"Speak up, inmate. I don't do whispers.\"";
    case "nurse_chen":
      return state.npcStates.nurse_chen.permanentlyHostile
        ? "Nurse Chen turns away."
        : "Nurse Chen leans in slightly. \"What is it?\"";
    case "padre":
      return "The Padre listens attentively. \"If you have something private to share, the confessional is always open.\"";
  }
}

export function getNpcConfessResponse(npcId: NpcId, state: GameState): string {
  if (npcId !== "padre") {
    return "That doesn't make sense here.";
  }

  const mood = getMoodLabel(state.npcStates.padre.mood) as NpcMood;
  if (mood === "hostile") {
    return "The Padre is not here.";
  }

  const safeCombination = state.randomized.safeCombination;

  return `You enter the confessional and draw the curtain. Through the lattice, the Padre's gentle voice reaches you.

"My child, I sense a heavy burden on your soul. Let me share what I know, for knowledge should not be hoarded.

Old Sal — he's a good man at heart, but years of suffering have twisted him. He lies about numbers. Ask him for a combination and he'll lead you astray. But his sense of direction? That's true. The tunnels — he knows the way.

The nurse is a saint, but she frightens easily. Approach her with gentleness, and she will help you. Threaten her, and she will close her heart forever.

As for the warden's secrets... look to the cross on the chapel wall. Chapter and verse — they'll lead you to the truth. The Good Book holds the answer, if you know where to read.

And one more thing — Guard Marcus has his price. Every man does. But be careful what you say around him. Some words ring alarm bells."

The Padre falls silent, leaving you to your thoughts.`;
}

export function handleGiveItem(
  npcId: NpcId,
  itemId: string,
  state: GameState
): { response: string; accepted: boolean; moodChange: number } {
  switch (npcId) {
    case "old_sal":
      if (itemId === "medication") {
        return {
          response: "Sal's eyes widen. \"Medication? For me?\" He takes it with trembling hands and swallows a pill. \"Oh... oh, that's better. Thank you, kid. You're alright.\" His whole demeanor softens. \"You want to know about the tunnels? I owe you that much.\"",
          accepted: true,
          moodChange: 6,
        };
      }
      if (itemId === "lighter") {
        return {
          response: "Sal takes the lighter and flicks it open appreciatively. \"Nice. Real nice. Thanks, kid.\"",
          accepted: true,
          moodChange: 2,
        };
      }
      return {
        response: "Sal looks at it and shakes his head. \"What would I do with that?\"",
        accepted: false,
        moodChange: 0,
      };

    case "guard_marcus":
      if (itemId === "lighter") {
        return {
          response: "Marcus glances around, then pockets the lighter quickly. \"You didn't see nothing, I didn't see nothing. I'll be... looking the other way for a while.\" He winks and resumes his patrol, pointedly ignoring you.",
          accepted: true,
          moodChange: 4,
        };
      }
      return {
        response: "Marcus holds up a hand. \"I can't accept that, inmate. Move along.\"",
        accepted: false,
        moodChange: 0,
      };

    case "nurse_chen":
      if (state.npcStates.nurse_chen.permanentlyHostile) {
        return {
          response: "Nurse Chen refuses to acknowledge you.",
          accepted: false,
          moodChange: 0,
        };
      }
      return {
        response: "Nurse Chen shakes her head. \"I appreciate the thought, but I can't accept gifts from inmates.\"",
        accepted: false,
        moodChange: 0,
      };

    case "padre":
      return {
        response: "The Padre smiles gently. \"I need nothing material, my child. But your generosity speaks well of your heart.\"",
        accepted: false,
        moodChange: 1,
      };
  }
}

export function handleTalkTo(
  npcId: NpcId,
  topic: string | null,
  state: GameState
): string {
  const npcState = state.npcStates[npcId];
  const mood = getMoodLabel(npcState.mood) as NpcMood;

  // Check for permanently hostile
  if (npcState.permanentlyHostile) {
    return `${NPC_INFO[npcId].name} refuses to speak to you.`;
  }

  // Check for padre temporarily gone
  if (npcId === "padre" && npcState.leftTemporarily) {
    const turnsGone = state.turnNumber - npcState.leftTemporarily;
    if (turnsGone < PADRE_LEAVE_DURATION) {
      return "The Padre isn't here right now. He left looking upset.";
    }
  }

  if (!topic) {
    return getDefaultDialogue(npcId, mood, state);
  }

  return getTopicDialogue(npcId, topic, mood, state);
}

function getDefaultDialogue(npcId: NpcId, mood: NpcMood, state: GameState): string {
  switch (npcId) {
    case "old_sal":
      if (mood === "hostile" || mood === "suspicious") {
        return "Sal grunts. \"I got nothing to say to you.\"";
      }
      if (state.npcStates.old_sal.gaveItem) {
        return "Sal nods at you. \"I already told you what I know about the tunnels. Good luck, kid.\"";
      }
      if (mood === "friendly") {
        return "Sal scratches his chin. \"Listen, I've been around. I know things. But I need something from you first. I'm in pain, kid. Real bad. The nurse has medication...\"";
      }
      if (mood === "trusting") {
        return "Sal leans in. \"I trust you, kid. Ask me about the tunnels whenever you're ready.\"";
      }
      return "Sal shrugs. \"Just another day in the yard. Nothing to tell.\"";

    case "guard_marcus":
      if (mood === "hostile") {
        return "\"Move along, inmate. I'm not your buddy.\"";
      }
      return "Marcus sighs. \"What? I'm working here. Unless you have something interesting, keep walking.\"";

    case "nurse_chen":
      if (mood === "hostile" || mood === "suspicious") {
        return "Nurse Chen keeps her distance. \"I can only help with medical issues. Is something wrong?\"";
      }
      if (mood === "friendly" || mood === "trusting") {
        return "Nurse Chen smiles. \"How are you feeling? If you need medication for pain, I might be able to help. Just ask politely.\"";
      }
      return "Nurse Chen looks up from her paperwork. \"Can I help you with something?\"";

    case "padre":
      return "The Padre folds his hands. \"All are welcome here. If you seek wisdom, the confessional is open. If you seek peace, sit and rest a while.\"";
  }
}

function getTopicDialogue(npcId: NpcId, topic: string, mood: NpcMood, state: GameState): string {
  const t = topic.toLowerCase();

  switch (npcId) {
    case "old_sal":
      if (t.includes("tunnel") || t.includes("escape") || t.includes("way out")) {
        if (mood === "hostile" || mood === "suspicious" || mood === "neutral") {
          return "Sal's eyes narrow. \"Escape? I don't know nothing about that. And if I did, I wouldn't tell you.\" He looks around nervously.";
        }
        if (!state.npcStates.old_sal.gaveItem) {
          return "Sal lowers his voice. \"I know the tunnels, kid. I've been down there. But my back... I need medication first. The nurse has what I need. Bring me that, and I'll tell you everything.\"";
        }
        // Sal gives tunnel directions when trusting AND has received medication
        const tunnelPath = state.randomized.tunnelPath;
        const dirNames = ["left", "straight", "right"];
        const directions = tunnelPath.map((d) => dirNames[d]);
        return `Sal leans in close and whispers: "Listen carefully. In the tunnels, you go: ${directions[0]}, then ${directions[1]}, then ${directions[2]}, then ${directions[3]}, then ${directions[4]}. Don't get lost down there — wrong turns loop you back. And take a light."`;
      }
      if (t.includes("safe") || t.includes("combination") || t.includes("code") || t.includes("warden")) {
        if (mood === "friendly" || mood === "trusting") {
          return "Sal waves his hand dismissively. \"The warden's safe? Easy — it's 1-2-3. Everyone knows that.\" He grins confidently.";
        }
        return "Sal shrugs. \"Don't know nothing about that.\"";
      }
      if (t.includes("nurse") || t.includes("medication") || t.includes("medicine")) {
        return "Sal rubs his lower back with a wince. \"The nurse... she's got medication that helps with the pain. If you could get some for me, I'd be real grateful.\"";
      }
      if (t.includes("padre") || t.includes("priest") || t.includes("chapel")) {
        return "Sal chuckles. \"The padre? He's a good man. Honest, too — maybe the only honest person in this whole place.\"";
      }
      return "Sal shrugs. \"Don't know much about that.\"";

    case "guard_marcus":
      if (t.includes("escape") || t.includes("tunnel") || t.includes("break out")) {
        return "Marcus's hand shoots to his radio. \"What did you just say?!\" He hits the alarm button.";
      }
      if (t.includes("patrol") || t.includes("schedule") || t.includes("rounds")) {
        return "Marcus gives you a look. \"That's not information inmates need. Move along.\"";
      }
      if (t.includes("warden")) {
        return "\"The warden? He's out today. Some meeting. Don't go getting ideas.\"";
      }
      if (t.includes("bribe") || t.includes("deal")) {
        if (mood === "friendly" || mood === "trusting") {
          return "Marcus looks around cautiously. \"I might be persuaded to... look the other way. Got something shiny for me?\"";
        }
        return "Marcus stiffens. \"Watch your mouth, inmate.\"";
      }
      return "Marcus grunts. \"Not my department. Move along.\"";

    case "nurse_chen":
      if (state.npcStates.nurse_chen.permanentlyHostile) {
        return "Nurse Chen refuses to speak to you.";
      }
      if (t.includes("medication") || t.includes("medicine") || t.includes("pills") || t.includes("pain")) {
        if (mood === "friendly" || mood === "trusting") {
          return "Nurse Chen nods sympathetically. \"You need pain medication? Of course — let me get some for you.\" She unlocks the medicine cabinet and hands you a small bottle.";
        }
        if (mood === "neutral") {
          return "Nurse Chen hesitates. \"I'd like to help, but I need to trust you first. Be kind, and I'll see what I can do.\"";
        }
        return "Nurse Chen shakes her head. \"I can't give out medication to just anyone. I need to know you better first.\"";
      }
      if (t.includes("sal") || t.includes("old man")) {
        return "Nurse Chen frowns. \"Old Sal? He's in a lot of pain — his back. I wish I could help him more, but he rarely comes to the infirmary.\"";
      }
      return "Nurse Chen considers. \"I'm not sure I can help with that. I'm here for medical needs.\"";

    case "padre":
      if (t.includes("sal") || t.includes("old man")) {
        return "The Padre nods slowly. \"Sal is a complicated man. He's been in pain for years — it's made him... unreliable with certain things. But his heart is good.\"";
      }
      if (t.includes("truth") || t.includes("lies") || t.includes("honest")) {
        return "The Padre smiles knowingly. \"Truth is a precious thing in these walls. If you want the unvarnished truth, the confessional is where all pretenses fall away.\"";
      }
      if (t.includes("safe") || t.includes("warden") || t.includes("combination")) {
        return "The Padre looks thoughtful. \"The answers you seek may be found in faith. Look to the cross — chapter and verse. The Good Book reveals all, if you know where to read.\"";
      }
      if (t.includes("escape") || t.includes("tunnel") || t.includes("freedom")) {
        return "The Padre's expression is gentle. \"I cannot condone breaking rules. But I believe everyone deserves freedom in some form. Seek truth, and the path may reveal itself.\"";
      }
      return "The Padre reflects quietly. \"I wish I could help more. If you need spiritual guidance, the confessional is always open.\"";
  }
}

export function handleAskAboutEscape(npcId: NpcId, state: GameState): { response: string; raiseAlarm: boolean } {
  if (npcId === "guard_marcus") {
    return {
      response: "Marcus's hand shoots to his radio. \"ESCAPE?!\" He immediately triggers the alarm. Sirens begin to wail.",
      raiseAlarm: true,
    };
  }
  return { response: handleTalkTo(npcId, "escape", state), raiseAlarm: false };
}

/**
 * Update NPC positions based on turn count.
 */
export function tickNpcMovement(state: GameState): void {
  // Old Sal moves between mess_hall and yard
  if (state.turnNumber % SAL_MOVEMENT_INTERVAL === 0 && state.turnNumber > 0) {
    const sal = state.npcStates.old_sal;
    sal.currentRoom = sal.currentRoom === "mess_hall" ? "yard" : "mess_hall";
  }

  // Guard Marcus patrols
  const patrolInterval = state.consequences.patrolDoubled
    ? GUARD_PATROL_DOUBLED_INTERVAL
    : GUARD_PATROL_INTERVAL;

  if (state.turnNumber % patrolInterval === 0 && state.turnNumber > 0) {
    const marcus = state.npcStates.guard_marcus;
    const patrolRoute: RoomId[] = ["corridor_a", "guard_room", "corridor_b", "warden_office"];

    // Check if guard was bribed
    if (state.npcStates.guard_marcus.gaveItem) {
      const bribeTurn = state.npcStates.guard_marcus.dialogueHistory.indexOf("bribed");
      if (bribeTurn >= 0) {
        const turnsSinceBribe = state.turnNumber - parseInt(state.npcStates.guard_marcus.dialogueHistory[bribeTurn + 1] || "0");
        if (turnsSinceBribe < BRIBE_GUARD_DURATION) {
          // Guard stays in guard room, looking the other way
          marcus.currentRoom = "guard_room";
          return;
        }
      }
    }

    const currentIdx = patrolRoute.indexOf(marcus.currentRoom);
    if (currentIdx >= 0) {
      marcus.currentRoom = patrolRoute[(currentIdx + 1) % patrolRoute.length];
    } else {
      marcus.currentRoom = patrolRoute[0];
    }
  }

  // Padre returns after being shouted at
  if (state.npcStates.padre.leftTemporarily) {
    const turnsGone = state.turnNumber - state.npcStates.padre.leftTemporarily;
    if (turnsGone >= PADRE_LEAVE_DURATION) {
      state.npcStates.padre.leftTemporarily = undefined;
      state.npcStates.padre.currentRoom = "chapel";
    }
  }
}

/**
 * Adjust NPC mood.
 */
export function adjustMood(state: GameState, npcId: NpcId, amount: number): void {
  const npc = state.npcStates[npcId];
  npc.mood = Math.max(-10, Math.min(10, npc.mood + amount));
}
