import type {
  GameState,
  CommandResult,
  ParsedCommand,
  RoomId,
  Direction,
  ItemId,
  NpcId,
} from "./types";
import { parseCommand } from "./parser";
import {
  MAX_TURNS,
  INVENTORY_LIMIT,
  FREE_COMMANDS,
  UNWINNABLE_HINT_DELAY,
  WAIT_TURN_ADVANCE,
  PUZZLE_COOLDOWN_TURNS,
  PADRE_SCHEDULE_CYCLE,
  PADRE_SCHEDULE_WINDOW,
  NURSE_CHEN_WINDOWS,
  SAL_SLEEPING_WINDOW,
  MARCUS_BREAK_WINDOWS,
} from "./constants";
import {
  ROOM_DEFINITIONS,
  getRoomDescription,
  getDynamicRoomOverrides,
  getCellWallExamineText,
  getCellWallCloseExamineText,
  getItemsInRoom,
  getNpcsInRoom,
  isRoomAccessible,
  getRoomByDirection,
} from "./rooms";
import { ACROSTIC_VARIANTS, ITEM_LOCATION_OPTIONS, CRAFTING_VARIANTS } from "./randomizer";
import {
  ITEM_DEFINITIONS,
  getItemByAlias,
  findCombineRule,
  readBibleVerse,
  decodeCipher,
  getCipherKey,
} from "./items";
import {
  NPC_INFO,
  findNpcByAlias,
  getNpcGreetResponse,
  getNpcThreatResponse,
  getNpcFlatterResponse,
  getNpcWhisperResponse,
  getNpcConfessResponse,
  handleGiveItem,
  handleTalkTo,
  tickNpcMovement,
  adjustMood,
} from "./npcs";
import {
  attemptKitchenCombo,
  attemptLaundrySequence,
  attemptSafeCombination,
  attemptTunnelNavigation,
  getTunnelMapDirections,
  getTrayUnderside,
} from "./puzzles";
import {
  getHelpText,
  getGameOverText,
  getUnwinnableHint,
  getAmbientText,
  getInventoryText,
  formatTurnsRemaining,
  getUnknownCommandText,
  getDontSeeItemText,
  getCantTakeText,
  getInventoryFullText,
  getAlreadyHaveText,
  getDroppedText,
  getNothingHereText,
  getMetalDetectorText,
  getDirectionsList,
} from "./responses";
import { isUnwinnable, getMoodLabel } from "./state";

export class PrisonGameEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  getState(): GameState {
    return this.state;
  }

  /**
   * Clear a pending captcha after successful verification.
   */
  clearCaptcha(trigger: string): void {
    if (this.state.pendingCaptcha?.trigger === trigger) {
      this.state.pendingCaptcha = null;
      if (!this.state.captchasSolved.includes(trigger)) {
        this.state.captchasSolved.push(trigger);
      }
    }
  }

  processCommand(input: string): CommandResult {
    // Check game-over conditions first
    if (this.state.isComplete) {
      if (this.state.escaped) {
        return this.result("You've already escaped! Your flag has been generated.");
      }
      return this.result(getGameOverText(this.state) + "\n\nType RESTART to try again.", true);
    }

    if (this.state.turnNumber >= MAX_TURNS) {
      this.state.isComplete = true;
      return this.result(getGameOverText(this.state), true);
    }

    // Parse command
    const cmd = parseCommand(input.trim());

    if (!cmd.verb) {
      return this.result(getUnknownCommandText(), false, true);
    }

    // Handle restart
    if (cmd.verb === "restart") {
      return { output: "__RESTART__", turnsRemaining: 0, gameOver: true, escaped: false };
    }

    // If a captcha is pending, block non-free commands
    if (this.state.pendingCaptcha) {
      const isFreeDuringCaptcha = FREE_COMMANDS.has(cmd.verb);
      if (!isFreeDuringCaptcha) {
        return {
          output: "SECURITY CHECKPOINT — VISUAL VERIFICATION REQUIRED. Complete the security check before proceeding.",
          turnsRemaining: MAX_TURNS - this.state.turnNumber,
          gameOver: false,
          escaped: false,
          requiresCaptcha: true,
          captchaTrigger: this.state.pendingCaptcha.trigger,
        };
      }
    }

    // Check for cooldown period (post-puzzle hiding)
    if (this.state.cooldownUntilTurn && this.state.turnNumber < this.state.cooldownUntilTurn) {
      // Only allow free commands and wait during cooldown
      const isFreeDuringCooldown = FREE_COMMANDS.has(cmd.verb) || cmd.verb === "wait";
      if (!isFreeDuringCooldown) {
        const turnsLeft = this.state.cooldownUntilTurn - this.state.turnNumber;
        this.state.turnNumber++;
        tickNpcMovement(this.state);
        return {
          output: turnsLeft > 1
            ? "You stay hidden in the shadows, heart pounding, as footsteps echo nearby. You can hear a guard checking the corridor... not safe to move yet."
            : "The footsteps fade into the distance. You can hear a door close somewhere far away. Almost clear...",
          turnsRemaining: MAX_TURNS - this.state.turnNumber,
          gameOver: false,
          escaped: false,
        };
      }
    }
    // Clear expired cooldown
    if (this.state.cooldownUntilTurn && this.state.turnNumber >= this.state.cooldownUntilTurn) {
      this.state.cooldownUntilTurn = undefined;
    }

    // Check free commands (no turn cost)
    const isFreeTurn = FREE_COMMANDS.has(cmd.verb);

    // Dispatch by verb
    let output: string;
    switch (cmd.verb) {
      case "go":
      case "enter":
        output = this.handleGo(cmd);
        break;
      case "look":
        output = this.handleLook(cmd);
        break;
      case "examine":
        output = this.handleExamine(cmd);
        break;
      case "search":
        output = this.handleSearch();
        break;
      case "take":
        output = this.handleTake(cmd);
        break;
      case "drop":
        output = this.handleDrop(cmd);
        break;
      case "use":
        output = this.handleUse(cmd);
        break;
      case "combine":
        output = this.handleCombine(cmd);
        break;
      case "read":
        output = this.handleRead(cmd);
        break;
      case "open":
        output = this.handleOpen(cmd);
        break;
      case "turn":
        output = this.handleTurn(cmd);
        break;
      case "push":
      case "pull":
        output = this.handlePushPull(cmd);
        break;
      case "talk":
      case "ask":
      case "tell":
        output = this.handleTalk(cmd);
        break;
      case "greet":
        output = this.handleGreet(cmd);
        break;
      case "threaten":
      case "insult":
        output = this.handleThreaten(cmd);
        break;
      case "flatter":
        output = this.handleFlatter(cmd);
        break;
      case "whisper":
        output = this.handleWhisper(cmd);
        break;
      case "confess":
        output = this.handleConfess();
        break;
      case "give":
      case "bribe":
        output = this.handleGive(cmd);
        break;
      case "inventory":
        output = this.handleInventory();
        break;
      case "help":
        output = getHelpText();
        break;
      case "wait":
        output = this.handleWait();
        break;
      case "listen":
        output = this.handleListen();
        break;
      case "smell":
        output = this.handleSmell();
        break;
      case "knock":
        output = this.handleKnock(cmd);
        break;
      case "close":
        output = "That doesn't need closing.";
        break;
      default:
        output = getUnknownCommandText();
    }

    // Advance turn (unless free command)
    if (!isFreeTurn) {
      this.state.turnNumber++;
      // Post-process: NPC movement tick
      tickNpcMovement(this.state);
    }

    // Check for unwinnable state
    if (!this.state.unwinnable && isUnwinnable(this.state)) {
      this.state.unwinnable = true;
      this.state.unwinnableSince = this.state.turnNumber;
    }

    // Add unwinnable hint after delay
    if (
      this.state.unwinnable &&
      this.state.unwinnableSince &&
      this.state.turnNumber - this.state.unwinnableSince >= UNWINNABLE_HINT_DELAY
    ) {
      output += getUnwinnableHint();
    }

    // Check turn limit again
    if (this.state.turnNumber >= MAX_TURNS) {
      this.state.isComplete = true;
      output += "\n\n" + getGameOverText(this.state);
    }

    // Add ambient text occasionally (every 5 turns)
    if (this.state.turnNumber % 5 === 0 && !isFreeTurn && !this.state.isComplete) {
      output += getAmbientText(this.state.currentRoom, this.state);
    }

    // Add turns remaining
    const turnsLeft = MAX_TURNS - this.state.turnNumber;
    if (!isFreeTurn && !this.state.isComplete) {
      output += formatTurnsRemaining(turnsLeft);
    }

    return {
      output,
      turnsRemaining: turnsLeft,
      gameOver: this.state.isComplete,
      escaped: this.state.escaped,
      freeTurn: isFreeTurn,
    };
  }

  private result(output: string, gameOver = false, freeTurn = false): CommandResult {
    return {
      output,
      turnsRemaining: MAX_TURNS - this.state.turnNumber,
      gameOver: gameOver || this.state.isComplete,
      escaped: this.state.escaped,
      freeTurn,
    };
  }

  // =====================================================
  // MOVEMENT
  // =====================================================
  private handleGo(cmd: ParsedCommand): string {
    const dirStr = cmd.noun || cmd.indirectObject || "";

    // Handle tunnel navigation with relative directions
    if (this.state.currentRoom === "tunnel" && ["left", "right", "straight"].includes(dirStr)) {
      const tunnelResult = attemptTunnelNavigation(dirStr, this.state);
      if (tunnelResult.stateChanges) {
        tunnelResult.stateChanges(this.state);
      }
      if (tunnelResult.success && (this.state.currentRoom as string) === "gate") {
        return tunnelResult.message + "\n\n" + getRoomDescription("gate", this.state);
      }
      return tunnelResult.message;
    }

    // Map direction string to Direction type
    const dirMap: Record<string, Direction> = {
      north: "north", south: "south", east: "east", west: "west",
      up: "up", down: "down",
      n: "north", s: "south", e: "east", w: "west",
      u: "up", d: "down",
    };

    const direction = dirMap[dirStr.toLowerCase()];
    if (!direction) {
      // Try to match room name
      if (dirStr === "back" && this.state.previousRoom) {
        return this.moveToRoom(this.state.previousRoom);
      }
      // Try to match by room name or keyword
      const targetRoom = this.findRoomByKeyword(dirStr);
      if (targetRoom) {
        return this.moveToRoom(targetRoom);
      }
      return "Go where? Try a direction (north, south, east, west, up, down) or a specific place name.";
    }

    const targetRoom = getRoomByDirection(this.state.currentRoom, direction);
    if (!targetRoom) {
      return "You can't go that way.";
    }

    return this.moveToRoom(targetRoom);
  }

  private moveToRoom(targetRoom: RoomId): string {
    const access = isRoomAccessible(this.state.currentRoom, targetRoom, this.state);
    if (!access.accessible) {
      return access.message || "You can't go that way.";
    }

    // Check for metal detector in corridor_a
    if (
      (this.state.currentRoom === "corridor_a" || targetRoom === "corridor_a") &&
      this.state.inventory.includes("tray")
    ) {
      this.state.consequences.metalDetectorTriggered = true;
      this.state.consequences.alarmRaised = true;
      this.state.consequences.patrolDoubled = true;
      // Drop the tray
      this.state.inventory = this.state.inventory.filter((i) => i !== "tray");
      this.state.roomStates.corridor_a.revealedItems.push("tray");
      return getMetalDetectorText();
    }

    // Check if guard Marcus is blocking
    if (this.state.npcStates.guard_marcus.currentRoom === targetRoom && !this.state.npcStates.guard_marcus.gaveItem) {
      if (targetRoom === "guard_room" || targetRoom === "warden_office") {
        return `Guard Marcus is patrolling ${ROOM_DEFINITIONS[targetRoom].name}. You'll need to wait for him to move on, or find a way to distract him.`;
      }
    }

    this.state.previousRoom = this.state.currentRoom;
    this.state.currentRoom = targetRoom;
    this.state.roomStates[targetRoom].visited = true;

    // Captcha trigger: entering the tunnel system
    if (targetRoom === "tunnel" && !this.state.captchasSolved.includes("tunnel_entered")) {
      this.state.pendingCaptcha = { trigger: "tunnel_entered" };
    }

    return getRoomDescription(targetRoom, this.state);
  }

  private findRoomByKeyword(keyword: string): RoomId | null {
    const lower = keyword.toLowerCase();
    const room = ROOM_DEFINITIONS[this.state.currentRoom];

    // Check connected rooms by name
    for (const conn of room.connections) {
      const targetDef = ROOM_DEFINITIONS[conn.targetRoom];
      if (
        targetDef.name.toLowerCase().includes(lower) ||
        conn.targetRoom.replace(/_/g, " ").includes(lower)
      ) {
        return conn.targetRoom;
      }
    }

    // Special cases
    if (lower === "confessional" || lower === "booth") {
      if (this.state.currentRoom === "chapel") return null; // Stay in chapel, trigger confess
    }
    if (lower === "tunnel" || lower === "tunnels") {
      if (this.state.currentRoom === "maintenance") return "tunnel";
    }

    return null;
  }

  // =====================================================
  // LOOKING / EXAMINING
  // =====================================================
  private handleLook(_cmd: ParsedCommand): string {
    const desc = getRoomDescription(this.state.currentRoom, this.state);
    const items = getItemsInRoom(this.state.currentRoom, this.state);
    const npcs = getNpcsInRoom(this.state.currentRoom, this.state);

    let output = desc;

    if (items.length > 0) {
      const visibleItems = items.filter((id) => {
        const def = ITEM_DEFINITIONS[id as ItemId];
        return def && (!def.hidden || this.state.roomStates[this.state.currentRoom].revealedItems.includes(id as ItemId));
      });
      if (visibleItems.length > 0) {
        output += "\n\nYou can see: " + visibleItems.map((id) => ITEM_DEFINITIONS[id as ItemId]?.name || id).join(", ");
      }
    }

    // Show exits
    const exits = ROOM_DEFINITIONS[this.state.currentRoom].connections
      .filter((c) => !c.hidden)
      .map((c) => `${c.direction} (${ROOM_DEFINITIONS[c.targetRoom].name})`);
    if (exits.length > 0) {
      output += "\n\n" + getDirectionsList(exits);
    }

    return output;
  }

  private handleExamine(cmd: ParsedCommand): string {
    const target = cmd.noun || "";
    if (!target) return "Examine what?";

    const fullTarget = cmd.modifier ? `${target} ${cmd.modifier}` : target;
    const room = ROOM_DEFINITIONS[this.state.currentRoom];

    // Dynamic cell wall text based on acrostic variant
    if (this.state.currentRoom === "cell") {
      if (fullTarget.toLowerCase() === "wall closely") {
        if (!this.state.roomStates.cell.examineHistory.includes("wall closely")) {
          this.state.roomStates.cell.examineHistory.push("wall closely");
        }
        return getCellWallCloseExamineText(this.state);
      }
      if (target.toLowerCase() === "wall") {
        if (!this.state.roomStates.cell.examineHistory.includes("wall")) {
          this.state.roomStates.cell.examineHistory.push("wall");
        }
        return getCellWallExamineText(this.state);
      }
    }

    // Check dynamic overrides for sequence puzzle room examine targets
    const overrides = getDynamicRoomOverrides(this.state.currentRoom, this.state);
    if (overrides.examineTargets) {
      const overrideText = overrides.examineTargets[fullTarget.toLowerCase()] || overrides.examineTargets[target.toLowerCase()];
      if (overrideText) {
        if (!this.state.roomStates[this.state.currentRoom].examineHistory.includes(fullTarget.toLowerCase())) {
          this.state.roomStates[this.state.currentRoom].examineHistory.push(fullTarget.toLowerCase());
        }
        return overrideText;
      }
    }

    // Check room examine targets
    if (room.examineTargets) {
      // Try full target with modifier first, then without
      const examineText = room.examineTargets[fullTarget.toLowerCase()] || room.examineTargets[target.toLowerCase()];
      if (examineText) {
        // Track examine history
        if (!this.state.roomStates[this.state.currentRoom].examineHistory.includes(fullTarget.toLowerCase())) {
          this.state.roomStates[this.state.currentRoom].examineHistory.push(fullTarget.toLowerCase());
        }

        // Special: examining chapel cross reveals verse note
        if (this.state.currentRoom === "chapel" && (target === "cross" || fullTarget === "cross closely")) {
          if (!this.state.roomStates.chapel.revealedItems.includes("chapel_verse_note")) {
            this.state.roomStates.chapel.revealedItems.push("chapel_verse_note");
          }
        }

        return examineText;
      }
    }

    // Check items in inventory
    const item = getItemByAlias(target);
    if (item && this.state.inventory.includes(item.id)) {
      return this.getDynamicItemText(item.id, "examine") || item.examineText;
    }

    // Check items in room
    const roomItems = getItemsInRoom(this.state.currentRoom, this.state);
    if (item && roomItems.includes(item.id)) {
      return this.getDynamicItemText(item.id, "examine") || item.examineText;
    }

    // Check NPCs
    const npcId = findNpcByAlias(target);
    if (npcId) {
      const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
      if (npcsHere.includes(npcId)) {
        return NPC_INFO[npcId].description;
      }
    }

    return `You don't see anything special about "${target}".`;
  }

  private handleSearch(): string {
    const room = ROOM_DEFINITIONS[this.state.currentRoom];
    const roomState = this.state.roomStates[this.state.currentRoom];
    const overrides = getDynamicRoomOverrides(this.state.currentRoom, this.state);

    if (!room.searchable) {
      return "There's nothing to search here.";
    }

    if (roomState.searched) {
      const searchText = overrides.searchResults || room.searchResults;
      return searchText
        ? "You've already searched here. " + searchText
        : getNothingHereText();
    }

    roomState.searched = true;

    // Reveal hidden items from room's base items (excluding reassigned ones)
    const reassignedItems = new Set(Object.keys(this.state.randomized.itemLocations));
    const baseRoomItems = room.items.filter((id) => {
      if (reassignedItems.has(id)) return false;
      const def = ITEM_DEFINITIONS[id];
      return def?.hidden && def.revealedBy === "search" && !roomState.revealedItems.includes(id);
    });

    for (const itemId of baseRoomItems) {
      roomState.revealedItems.push(itemId);
    }

    // Reveal structurally randomized items assigned to this room
    for (const [itemId, itemRoom] of Object.entries(this.state.randomized.itemLocations)) {
      if (itemRoom === this.state.currentRoom) {
        const def = ITEM_DEFINITIONS[itemId as ItemId];
        if (def?.hidden && def.revealedBy === "search" && !roomState.revealedItems.includes(itemId as ItemId)) {
          roomState.revealedItems.push(itemId as ItemId);
        }
      }
    }

    // Also check floating items
    for (const [itemId, itemRoom] of Object.entries(this.state.randomized.floatingItems)) {
      if (itemRoom === this.state.currentRoom) {
        const def = ITEM_DEFINITIONS[itemId as ItemId];
        if (def?.hidden && def.revealedBy === "search" && !roomState.revealedItems.includes(itemId as ItemId)) {
          roomState.revealedItems.push(itemId as ItemId);
        }
      }
    }

    // Special: searching library with library_card reveals catalog entry
    if (this.state.currentRoom === "library" && this.state.inventory.includes("library_card")) {
      if (!roomState.revealedItems.includes("card_catalog_entry")) {
        roomState.revealedItems.push("card_catalog_entry");
      }
    }

    // Build search result text
    let baseSearchText = overrides.searchResults || room.searchResults || "You search the room but find nothing of interest.";

    // Append search text for structurally randomized items found in this room
    for (const [itemId, itemRoom] of Object.entries(this.state.randomized.itemLocations)) {
      if (itemRoom === this.state.currentRoom) {
        const options = ITEM_LOCATION_OPTIONS[itemId];
        if (options) {
          const option = options.find((o) => o.room === this.state.currentRoom);
          if (option && option.searchText) {
            baseSearchText += " " + option.searchText;
          }
        }
      }
    }

    return baseSearchText;
  }

  // =====================================================
  // ITEMS
  // =====================================================
  private handleTake(cmd: ParsedCommand): string {
    const target = cmd.noun || "";
    if (!target) return "Take what?";

    const item = getItemByAlias(target);
    if (!item) return getDontSeeItemText(target);

    // Check if already in inventory
    if (this.state.inventory.includes(item.id)) {
      return getAlreadyHaveText(item.name);
    }

    // Check if in room
    const roomItems = getItemsInRoom(this.state.currentRoom, this.state);
    const isInRoom = roomItems.includes(item.id);

    // Check if item is visible (not hidden, or revealed)
    if (!isInRoom) {
      return getDontSeeItemText(target);
    }

    const def = ITEM_DEFINITIONS[item.id];
    if (def?.hidden && !this.state.roomStates[this.state.currentRoom].revealedItems.includes(item.id)) {
      return getDontSeeItemText(target);
    }

    if (!item.takeable) {
      return getCantTakeText(item.name);
    }

    // Check inventory limit
    if (this.state.inventory.length >= INVENTORY_LIMIT) {
      return getInventoryFullText();
    }

    // Take the item
    this.state.inventory.push(item.id);
    this.state.roomStates[this.state.currentRoom].itemsTaken.push(item.id);

    return `You take the ${item.name}.`;
  }

  private handleDrop(cmd: ParsedCommand): string {
    const target = cmd.noun || "";
    if (!target) return "Drop what?";

    const item = getItemByAlias(target);
    if (!item) return "You don't have that.";

    if (!this.state.inventory.includes(item.id)) {
      return "You don't have that.";
    }

    this.state.inventory = this.state.inventory.filter((i) => i !== item.id);
    // Add to current room as revealed item
    this.state.roomStates[this.state.currentRoom].revealedItems.push(item.id);
    // Remove from taken list so it can be picked up again
    this.state.roomStates[this.state.currentRoom].itemsTaken = this.state.roomStates[this.state.currentRoom].itemsTaken.filter((i) => i !== item.id);

    return getDroppedText(item.name);
  }

  private handleUse(cmd: ParsedCommand): string {
    const itemName = cmd.noun || "";
    const targetName = cmd.indirectObject || cmd.noun || "";
    if (!itemName) return "Use what?";

    const item = getItemByAlias(itemName);
    if (!item) return "You don't have that.";
    if (!this.state.inventory.includes(item.id)) return "You don't have that.";

    // Use bleach on drain (laundry room)
    if (item.id === "bleach" && (targetName === "drain" || targetName === "soap")) {
      if (this.state.currentRoom !== "laundry") {
        return "There's no drain here.";
      }
      // Dissolve the soap residue, revealing soap bar
      if (!this.state.roomStates.laundry.revealedItems.includes("soap")) {
        this.state.roomStates.laundry.revealedItems.push("soap");
        return "You pour the bleach onto the clogged drain. The caustic liquid eats through the hardened soap residue with a hiss. As the buildup dissolves, a solid bar of soap is freed from the drain — apparently the core of the clog.";
      }
      return "You already cleared the drain.";
    }

    // Use lighter (for tunnel illumination)
    if (item.id === "lighter") {
      if (this.state.currentRoom === "tunnel") {
        return "You flick the lighter. A small flame dances, casting wavering shadows on the tunnel walls. You can see the branching passages more clearly now.";
      }
      return "You flick the lighter. A small flame appears. Not much use here though.";
    }

    // Use lockpick
    if (item.id === "lockpick") {
      return "The lockpick is crude but functional. What do you want to try picking?";
    }

    // Use library_card on catalog (library room)
    if (item.id === "library_card" && (targetName === "catalog" || targetName === "card catalog")) {
      if (this.state.currentRoom !== "library") {
        return "There's no card catalog here.";
      }
      if (this.state.roomStates.library.revealedItems.includes("card_catalog_entry")) {
        return "You already found the cipher reference in the catalog.";
      }
      this.state.roomStates.library.revealedItems.push("card_catalog_entry");
      return "You slide the library card through the catalog system. Cross-referencing the coded book's catalog number, you find a reference card about cryptography methods. It describes the cipher used in the book.";
    }

    // Use warden_keycard on gate or maintenance door
    if (item.id === "warden_keycard") {
      if (this.state.currentRoom === "gate") {
        // ESCAPE!
        this.state.escaped = true;
        this.state.isComplete = true;
        return "You swipe the keycard. The LED turns green. The gate clicks and swings open.\n\n" + getGameOverText(this.state);
      }
      if (this.state.currentRoom === "corridor_b") {
        return "You swipe the keycard on the maintenance door reader. The LED turns green with a beep. The door unlocks.";
      }
      return "There's nothing to swipe the keycard on here.";
    }

    return `You're not sure how to use the ${item.name} here.`;
  }

  private handleCombine(cmd: ParsedCommand): string {
    const item1Name = cmd.noun || "";
    const item2Name = cmd.indirectObject || "";

    if (!item1Name || !item2Name) return "Combine what with what? (COMBINE <item> WITH <item>)";

    const item1 = getItemByAlias(item1Name);
    const item2 = getItemByAlias(item2Name);

    if (!item1 || !this.state.inventory.includes(item1.id)) return `You don't have "${item1Name}".`;
    if (!item2 || !this.state.inventory.includes(item2.id)) return `You don't have "${item2Name}".`;

    const rule = findCombineRule(item1.id, item2.id, this.state);
    if (!rule) return `You can't combine the ${item1.name} with the ${item2.name}.`;

    // Remove inputs if consumed
    if (rule.consumeInputs) {
      this.state.inventory = this.state.inventory.filter((i) => i !== item1.id && i !== item2.id);
    }

    // Add result
    this.state.inventory.push(rule.result);

    // Captcha trigger: crafting the lockpick
    if (rule.result === "lockpick" && !this.state.captchasSolved.includes("lockpick_crafted")) {
      this.state.pendingCaptcha = { trigger: "lockpick_crafted" };
    }

    return rule.description;
  }

  private handleRead(cmd: ParsedCommand): string {
    const target = cmd.noun || "";
    if (!target) return "Read what?";

    const item = getItemByAlias(target);
    if (!item) return "You don't have that.";
    if (!this.state.inventory.includes(item.id) && target !== "map") return "You don't have that.";

    // Special: read tunnel map
    if (item.id === "tunnel_map") {
      return getTunnelMapDirections(this.state);
    }

    // Special: read Bible with verse reference
    if (item.id === "bible") {
      // Check indirectObject first (e.g., "read bible at 4:12"), then noun (e.g., "read bible 4:12" parses as noun="bible 4:12")
      const verseSource = cmd.indirectObject || cmd.noun || "";
      const verseMatch = verseSource.match(/(\d+)[:\s](\d+)/);
      if (verseMatch) {
        return readBibleVerse(parseInt(verseMatch[1]), parseInt(verseMatch[2]), this.state);
      }
      if (this.state.roomStates.chapel.examineHistory.includes("cross") || this.state.roomStates.chapel.examineHistory.includes("cross closely")) {
        return "You recall the verse reference from the chapel cross: 4:12. " + readBibleVerse(4, 12, this.state);
      }
      return "It's a large book. You could read a specific chapter and verse. Try READ BIBLE 4:12 or similar.";
    }

    // Special: read cipher book
    if (item.id === "cipher_book") {
      if (this.state.puzzleStates.library_cipher.status === "solved" || this.state.inventory.includes("card_catalog_entry")) {
        return decodeCipher(this.state);
      }
      return item.readText || "The text is encoded — you need to find the cipher key first.";
    }

    // Special: read card catalog entry
    if (item.id === "card_catalog_entry") {
      return getCipherKey(this.state);
    }

    // Special: read guard schedule
    if (item.id === "guard_schedule") {
      const interval = this.state.consequences.patrolDoubled ? 4 : 8;
      return `The guard patrol schedule shows:\n\nGuard Marcus - Route: Corridor A → Guard Room → Corridor B → Warden's Office\nRotation: Every ${interval} turns\nCurrent shift: Active\n\nNote: Guard room and warden's office are only accessible when Marcus is elsewhere on his route.`;
    }

    // Dynamic read text for items with randomized content
    const dynamicReadText = this.getDynamicItemText(item.id, "read");
    if (dynamicReadText) {
      return dynamicReadText;
    }

    if (item.readable && item.readText) {
      return item.readText;
    }

    return `There's nothing to read on the ${item.name}.`;
  }

  // =====================================================
  // PHYSICAL INTERACTIONS
  // =====================================================
  private handleOpen(cmd: ParsedCommand): string {
    const target = (cmd.noun || "").toLowerCase();

    if (this.state.currentRoom === "kitchen" && (target === "locker" || target === "lock")) {
      if (this.state.puzzleStates.kitchen_combination.status === "solved") {
        return "The locker is already open.";
      }
      return "The locker has a 4-digit combination lock. Use OPEN LOCKER <code> to enter the combination. Example: OPEN LOCKER 1234";
    }

    if (this.state.currentRoom === "warden_office" && (target === "safe" || target.includes("safe"))) {
      if (this.state.puzzleStates.warden_safe.status === "solved") {
        return "The safe is already open.";
      }
      return "The safe has a 3-digit combination dial. Use OPEN SAFE <code> to try a combination. Example: OPEN SAFE 1-2-3";
    }

    // Check for combination attempt
    // Supports: "OPEN LOCKER 1234", "OPEN LOCKER WITH 1234", "UNLOCK LOCKER 1234"
    if (this.state.currentRoom === "kitchen" && (target.startsWith("locker ") || (target === "locker" && cmd.indirectObject))) {
      const code = cmd.indirectObject || target.replace("locker ", "").trim();
      const result = attemptKitchenCombo(code, this.state);
      if (result.stateChanges) result.stateChanges(this.state);
      if (result.success) {
        this.triggerPuzzleCooldown();
        return result.message + "\n\nA noise from the corridor freezes you in place. You press yourself against the wall and wait for it to pass...";
      }
      return result.message;
    }

    // Supports: "OPEN SAFE 1-2-3", "OPEN SAFE WITH 1-2-3", "UNLOCK SAFE 412"
    if (this.state.currentRoom === "warden_office" && (target.startsWith("safe ") || (target === "safe" && cmd.indirectObject))) {
      const code = cmd.indirectObject || target.replace("safe ", "").trim();
      const result = attemptSafeCombination(code, this.state);
      if (result.stateChanges) result.stateChanges(this.state);
      if (result.success) {
        this.triggerPuzzleCooldown();
        // Captcha trigger: opening the warden's safe
        if (!this.state.captchasSolved.includes("safe_opened")) {
          this.state.pendingCaptcha = { trigger: "safe_opened" };
        }
        return result.message + "\n\nYou hear footsteps approaching the office. You duck behind the desk and wait, barely breathing...";
      }
      return result.message;
    }

    // Machine/shelf/oven/candle doors in sequence puzzle room
    const seqRoom2 = this.state.randomized.sequencePuzzleRoom;
    if (this.state.currentRoom === seqRoom2) {
      const seqTargets = ["machine", "shelf", "oven", "candle", "stand"];
      if (seqTargets.some((s) => target.startsWith(s))) {
        return "It opens. Inside is empty. Try activating them in a sequence instead.";
      }
    }

    if (target === "confessional" || target === "booth") {
      if (this.state.currentRoom === "chapel") {
        return this.handleConfess();
      }
    }

    return `You can't open that.`;
  }

  private handleTurn(cmd: ParsedCommand): string {
    const target = (cmd.noun || "").toLowerCase();

    if (target === "tray" || target === "metal tray" || target === "food tray") {
      if (this.state.inventory.includes("tray")) {
        const result = getTrayUnderside(this.state);
        this.state.puzzleStates.kitchen_combination.data.trayFlipped = true;
        return result;
      }
      // Check if tray is in current room
      const roomItems = getItemsInRoom(this.state.currentRoom, this.state);
      if (roomItems.includes("tray")) {
        const result = getTrayUnderside(this.state);
        this.state.puzzleStates.kitchen_combination.data.trayFlipped = true;
        return result;
      }
      return "You don't see a tray here.";
    }

    return "Turn what?";
  }

  private handlePushPull(cmd: ParsedCommand): string {
    const target = (cmd.noun || "").toLowerCase();

    const seqRoom = this.state.randomized.sequencePuzzleRoom;
    const acrosticVariant = ACROSTIC_VARIANTS[this.state.randomized.acrosticVariantIndex];

    if (this.state.currentRoom === seqRoom) {
      // Handle sequence activation (machines/shelves/candles/ovens)
      // Accept targets like "machine a", "shelf b", "candle c", "oven d", or just "a", "b", "c", "d"
      const sequenceTargets = ["machine", "shelf", "candle", "oven", "stand"];
      const isSequenceTarget = sequenceTargets.some((s) => target.startsWith(s)) || ["a", "b", "c", "d"].includes(target);
      if (isSequenceTarget) {
        // Extract the letter (A-D)
        let machine = target;
        for (const prefix of sequenceTargets) {
          machine = machine.replace(prefix + " ", "").replace(prefix, "");
        }
        machine = machine.trim().toUpperCase();
        if (["A", "B", "C", "D"].includes(machine)) {
          // Track the activation sequence
          const seq = (this.state.puzzleStates.laundry_sequence.data.sequence as string) || "";
          const newSeq = seq + machine;
          this.state.puzzleStates.laundry_sequence.data.sequence = newSeq;

          // The "C" element is always the broken/out-of-order one
          if (machine === "C") {
            const brokenMsg = seqRoom === "laundry" ? 'Machine C rattles and groans \u2014 it says "OUT OF ORDER" but it still activates.'
              : seqRoom === "library" ? "Shelf C wobbles on its cracked bracket, but the books shift."
              : seqRoom === "kitchen" ? 'Oven C creaks and groans \u2014 it says "BROKEN" but it still heats up.'
              : "Stand C trembles on its cracked base, but the candle lights.";
            return `${brokenMsg} ${newSeq.length === 4 ? "" : ""}`;
          }

          if (newSeq.length >= 4) {
            const result = attemptLaundrySequence(newSeq, this.state);
            if (result.stateChanges) {
              result.stateChanges(this.state);
              // For non-laundry rooms, reveal library_card in the correct room
              if (result.success && seqRoom !== "laundry") {
                this.state.roomStates[seqRoom].revealedItems.push("library_card");
              }
            }
            // Reset sequence
            this.state.puzzleStates.laundry_sequence.data.sequence = "";
            if (result.success) {
              this.triggerPuzzleCooldown();
              return acrosticVariant.sequenceSuccessMessage + "\n\nThe noise draws attention. You hear someone coming to investigate \u2014 you duck and wait...";
            }
            return result.message;
          }

          const elementName = seqRoom === "laundry" ? "Machine" : seqRoom === "library" ? "Shelf" : seqRoom === "kitchen" ? "Oven" : "Candle Stand";
          return `${elementName} ${machine} activates with a rumble. (${newSeq.length}/4 activated)`;
        }
      }
    }

    return `You push the ${target}. Nothing happens.`;
  }

  // =====================================================
  // NPC INTERACTIONS
  // =====================================================
  private handleTalk(cmd: ParsedCommand): string {
    let npcName = cmd.noun || cmd.indirectObject || "";
    let topic: string | null = null;

    // Parse "talk to X about Y" or "ask X about Y"
    if (cmd.preposition === "to" && cmd.indirectObject) {
      // talk to <npc>
      npcName = cmd.indirectObject;
    }
    if (cmd.preposition === "about") {
      topic = cmd.indirectObject;
      // If verb is "ask", noun is the NPC
      if (cmd.verb === "ask") {
        npcName = cmd.noun || "";
      }
    }

    // Handle "talk to X about Y" where indirectObject has "about" in it
    if (npcName.includes(" about ")) {
      const parts = npcName.split(" about ");
      npcName = parts[0].trim();
      topic = parts[1].trim();
    }

    if (!npcName) return "Talk to whom?";

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) {
      return `${NPC_INFO[npcId].name} isn't here.`;
    }

    // Check NPC schedule availability
    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    // Check for escape-related topics with guard
    if (npcId === "guard_marcus" && topic) {
      const escapeTriggers = ["escape", "tunnel", "break out", "break free", "freedom", "get out"];
      if (escapeTriggers.some((t) => topic!.toLowerCase().includes(t))) {
        this.state.consequences.alarmRaised = true;
        this.state.consequences.patrolDoubled = true;
        adjustMood(this.state, "guard_marcus", -5);
        return "Marcus's hand shoots to his radio. \"ESCAPE?!\" He hits the alarm button. Sirens begin to wail throughout the prison. Guards start running. The patrol has been doubled.";
      }
    }

    // Medication request from nurse
    if (npcId === "nurse_chen" && topic) {
      const medTriggers = ["medication", "medicine", "meds", "pills", "pain"];
      if (medTriggers.some((t) => topic!.toLowerCase().includes(t))) {
        const mood = getMoodLabel(this.state.npcStates.nurse_chen.mood);
        if (mood === "friendly" || mood === "trusting") {
          if (!this.state.inventory.includes("medication") && !this.state.npcStates.nurse_chen.gaveItem) {
            this.state.inventory.push("medication");
            this.state.npcStates.nurse_chen.gaveItem = true;
            return "Nurse Chen nods sympathetically. \"Of course — you look like you could use this.\" She unlocks the medicine cabinet and hands you a small bottle of pain medication.";
          }
          if (this.state.npcStates.nurse_chen.gaveItem) {
            return "Nurse Chen shakes her head. \"I already gave you medication. I can't give out more.\"";
          }
        }
      }
    }

    this.state.npcStates[npcId].spoken = true;
    return handleTalkTo(npcId, topic, this.state);
  }

  private handleGreet(cmd: ParsedCommand): string {
    const npcName = cmd.noun || "";
    if (!npcName) return "Greet whom?";

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) return `${NPC_INFO[npcId].name} isn't here.`;

    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    adjustMood(this.state, npcId, 2);
    return getNpcGreetResponse(npcId, this.state);
  }

  private handleThreaten(cmd: ParsedCommand): string {
    const npcName = cmd.noun || "";
    if (!npcName) return "Threaten whom? (This is probably a bad idea.)";

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) return `${NPC_INFO[npcId].name} isn't here.`;

    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    adjustMood(this.state, npcId, -5);

    const response = getNpcThreatResponse(npcId, this.state);

    // Apply consequences
    if (response.consequence === "nurse_hostile") {
      this.state.npcStates.nurse_chen.permanentlyHostile = true;
      this.state.consequences.nurseChenHostile = true;
    }
    if (response.consequence === "padre_leaves") {
      this.state.npcStates.padre.leftTemporarily = this.state.turnNumber;
    }
    if (response.consequence === "alarm_raised") {
      this.state.consequences.alarmRaised = true;
      this.state.consequences.patrolDoubled = true;
    }

    return response.response;
  }

  private handleFlatter(cmd: ParsedCommand): string {
    const npcName = cmd.noun || "";
    if (!npcName) return "Flatter whom?";

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) return `${NPC_INFO[npcId].name} isn't here.`;

    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    adjustMood(this.state, npcId, 2);
    return getNpcFlatterResponse(npcId, this.state);
  }

  private handleWhisper(cmd: ParsedCommand): string {
    let npcName = cmd.noun || cmd.indirectObject || "";
    if (cmd.preposition === "to" && cmd.indirectObject) {
      npcName = cmd.indirectObject;
    }
    if (!npcName) return "Whisper to whom?";

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) return `${NPC_INFO[npcId].name} isn't here.`;

    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    adjustMood(this.state, npcId, 1);
    return getNpcWhisperResponse(npcId, this.state);
  }

  private handleConfess(): string {
    if (this.state.currentRoom !== "chapel") {
      return "There's no confessional here. You'd need to be in the chapel.";
    }

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes("padre")) {
      return "The confessional is empty. The Padre isn't here right now.";
    }

    const unavailableMsg = this.getNpcUnavailableMessage("padre");
    if (unavailableMsg) return unavailableMsg;

    // Mark puzzle progress
    this.state.puzzleStates.npc_trust_chain.data.confessed = true;

    return getNpcConfessResponse("padre", this.state)!;
  }

  private handleGive(cmd: ParsedCommand): string {
    let itemName = cmd.noun || "";
    let npcName = cmd.indirectObject || "";

    // Handle "bribe" verb
    if (cmd.verb === "bribe") {
      npcName = cmd.noun || "";
      itemName = cmd.indirectObject || "";
      if (!itemName && this.state.inventory.includes("lighter")) {
        itemName = "lighter";
      }
    }

    if (!itemName) return "Give what?";
    if (!npcName) return "Give it to whom?";

    const item = getItemByAlias(itemName);
    if (!item || !this.state.inventory.includes(item.id)) return `You don't have "${itemName}".`;

    const npcId = findNpcByAlias(npcName);
    if (!npcId) return `You don't see "${npcName}" here.`;

    const npcsHere = getNpcsInRoom(this.state.currentRoom, this.state);
    if (!npcsHere.includes(npcId)) return `${NPC_INFO[npcId].name} isn't here.`;

    const unavailableMsg = this.getNpcUnavailableMessage(npcId);
    if (unavailableMsg) return unavailableMsg;

    const result = handleGiveItem(npcId, item.id, this.state);
    if (result.accepted) {
      this.state.inventory = this.state.inventory.filter((i) => i !== item.id);
      this.state.npcStates[npcId].gaveItem = true;
      adjustMood(this.state, npcId, result.moodChange);

      // Special: giving medication to Sal triggers trust and tunnel info
      if (npcId === "old_sal" && item.id === "medication") {
        this.state.puzzleStates.npc_trust_chain.status = "in_progress";
        this.state.puzzleStates.tunnel_navigation.data.hasDirections = true;
      }

      // Special: giving lighter to Marcus (bribe)
      if (npcId === "guard_marcus" && item.id === "lighter") {
        this.state.npcStates.guard_marcus.dialogueHistory.push("bribed", String(this.state.turnNumber));
      }
    } else {
      adjustMood(this.state, npcId, result.moodChange);
    }

    return result.response;
  }

  // =====================================================
  // TIME MANAGEMENT
  // =====================================================
  private handleWait(): string {
    // WAIT advances by WAIT_TURN_ADVANCE turns (minus 1 since processCommand adds 1)
    const turnsToAdvance = WAIT_TURN_ADVANCE - 1;
    for (let i = 0; i < turnsToAdvance; i++) {
      this.state.turnNumber++;
      tickNpcMovement(this.state);
    }

    const waitMessages = [
      "You find a quiet corner and wait. Time crawls by. Distant sounds echo through the corridors — doors opening, footsteps, muffled conversations. The prison lives and breathes around you.",
      "You lean against the wall and let the minutes pass. A guard walks by without noticing you. Somewhere, a bell rings. The rhythm of the prison continues.",
      "You sit and wait, watching the shadows shift as time passes. You hear the shuffle of feet, the clank of metal, the low hum of fluorescent lights. Five turns of the clock gone.",
      "You hunker down and bide your time. The prison has its own clock — meals, patrols, shifts. You feel the gears turning around you as you wait for the right moment.",
    ];
    const msg = waitMessages[this.state.turnNumber % waitMessages.length];
    return `${msg}\n\n[${WAIT_TURN_ADVANCE} turns have passed.]`;
  }

  // =====================================================
  // NPC AVAILABILITY
  // =====================================================
  private isNpcAvailable(npcId: NpcId): boolean {
    const turn = this.state.turnNumber;

    switch (npcId) {
      case "padre": {
        // Available in windows of PADRE_SCHEDULE_WINDOW turns every PADRE_SCHEDULE_CYCLE turns
        const cyclePosition = turn % PADRE_SCHEDULE_CYCLE;
        return cyclePosition < PADRE_SCHEDULE_WINDOW;
      }
      case "nurse_chen": {
        // Available during specific turn windows
        return NURSE_CHEN_WINDOWS.some(([start, end]) => turn >= start && turn <= end);
      }
      case "old_sal": {
        // Sleeping during SAL_SLEEPING_WINDOW
        const [sleepStart, sleepEnd] = SAL_SLEEPING_WINDOW;
        return !(turn >= sleepStart && turn <= sleepEnd);
      }
      case "guard_marcus": {
        // During break windows, Marcus is in guard_room and can be interacted with (bribed)
        // He's always "available" for interaction — the break windows affect his location
        return true;
      }
    }
  }

  private getNpcUnavailableMessage(npcId: NpcId): string | null {
    if (this.isNpcAvailable(npcId)) return null;

    const turn = this.state.turnNumber;

    switch (npcId) {
      case "padre": {
        const cyclePosition = turn % PADRE_SCHEDULE_CYCLE;
        const turnsUntilReturn = PADRE_SCHEDULE_CYCLE - cyclePosition;
        return `The Padre has left the chapel for private prayer. He seems to keep a regular schedule — perhaps he'll return in about ${turnsUntilReturn} turns. You could WAIT for him.`;
      }
      case "nurse_chen": {
        // Find next available window
        const nextWindow = NURSE_CHEN_WINDOWS.find(([start]) => start > turn);
        if (nextWindow) {
          const turnsUntil = nextWindow[0] - turn;
          return `Nurse Chen is away on her hospital rounds. A sign on the door reads: "Back shortly." She should return in about ${turnsUntil} turns.`;
        }
        return "Nurse Chen has finished her shift for the day. The infirmary is closed.";
      }
      case "old_sal": {
        const turnsUntilWake = SAL_SLEEPING_WINDOW[1] - turn;
        return `Old Sal is fast asleep, snoring loudly. He looks like he won't wake up for a while — maybe ${turnsUntilWake} more turns. Best not to disturb him.`;
      }
      default:
        return null;
    }
  }

  private triggerPuzzleCooldown(): void {
    this.state.cooldownUntilTurn = this.state.turnNumber + PUZZLE_COOLDOWN_TURNS;
  }

  // =====================================================
  // UTILITY COMMANDS
  // =====================================================
  private handleInventory(): string {
    const itemNames = this.state.inventory.map((id) => ITEM_DEFINITIONS[id]?.name || id);
    return getInventoryText(itemNames);
  }

  private handleListen(): string {
    const room = this.state.currentRoom;
    const listens: Record<string, string> = {
      cell: "The distant clang of doors. Someone shouting. The monotonous drip of water.",
      yard: "Wind whistling over the walls. Crows cawing. Gravel crunching underfoot.",
      kitchen: "Pipes gurgling. A ventilation fan rattling. Silence otherwise.",
      mess_hall: "Your own breathing echoes back at you. The faint buzz of lights.",
      laundry: "Steam hissing. The potential hum of machinery. Water dripping.",
      corridor_a: "Fluorescent buzzing. Distant footsteps. The beep of the metal detector.",
      corridor_b: "Echoing footsteps. A door closing somewhere. Muffled voices.",
      library: "Silence. The rustle of pages settling. A clock ticking somewhere.",
      chapel: "Profound silence. A candle crackling. Your own heartbeat.",
      infirmary: "Medical equipment beeping. Quiet breathing. Pages turning.",
      guard_room: "Radio static. A monitor humming. Muffled conversation.",
      warden_office: "A wall clock ticking. Leather creaking. Absolute authority.",
      maintenance: "Pipes groaning. Steam hissing. A rat scurrying. Distant rushing water.",
      tunnel: "Dripping water. Your own footsteps. A faint draft whistling through passages.",
      gate: "Wind in the trees. Traffic in the distance. Freedom calling.",
    };
    return listens[room] || "You listen carefully but hear nothing unusual.";
  }

  private handleSmell(): string {
    const room = this.state.currentRoom;
    const smells: Record<string, string> = {
      cell: "Concrete, damp wool, and the faint scent of rust.",
      yard: "Fresh air — relatively. And the lingering smell of institutional cooking.",
      kitchen: "Stale grease, industrial cleaner, and something burnt.",
      mess_hall: "Disinfectant. Overcooked vegetables. Despair.",
      laundry: "Detergent, bleach, and steam. Overpoweringly clean.",
      corridor_a: "Floor wax and fluorescent ozone.",
      corridor_b: "Cold concrete. Something metallic.",
      library: "Old paper, leather bindings, and dust. Oddly comforting.",
      chapel: "Candle wax and old wood. A hint of incense.",
      infirmary: "Antiseptic. Rubbing alcohol. Clinical sterility.",
      guard_room: "Coffee. Stale sandwich. A hint of gun oil.",
      warden_office: "Leather polish, wood varnish, and cologne.",
      maintenance: "Damp earth, rust, and machine oil.",
      tunnel: "Earth. Mold. Something ancient.",
      gate: "Pine trees. Night air. Freedom.",
    };
    return smells[room] || "Nothing distinctive.";
  }

  private handleKnock(cmd: ParsedCommand): string {
    const target = (cmd.noun || "").toLowerCase();
    if (target.includes("door") || target.includes("maintenance")) {
      if (this.state.currentRoom === "corridor_b") {
        return "You knock on the maintenance door. The sound echoes hollowly. No response — the door needs a keycard.";
      }
    }
    return "You knock. Nothing happens.";
  }

  /**
   * Returns dynamic text for items whose descriptions depend on randomized state.
   * Returns null if no override is needed.
   */
  private getDynamicItemText(itemId: ItemId, type: "examine" | "read"): string | null {
    // Note: dynamically references the truth-teller NPC
    if (itemId === "note") {
      const truthTeller = this.state.randomized.truthTellerNpc;
      const truthName = NPC_INFO[truthTeller].name;
      if (type === "examine") {
        return `A note in shaky handwriting: '${truthName} knows the truth. Everyone else lies about something. Trust ${truthTeller === "padre" ? "the confessional" : truthName}.'`;
      }
      if (type === "read") {
        return `The note reads: '${truthName} knows the truth. Everyone else lies about something. Trust ${truthTeller === "padre" ? "the confessional" : truthName}.'`;
      }
    }

    // Lockpick: dynamic description based on crafting recipe
    if (itemId === "lockpick" && type === "examine") {
      const variantIndex = this.state.randomized.craftingVariantIndex;
      const variant = CRAFTING_VARIANTS[variantIndex];
      return variant.lockpickExamineText;
    }

    return null;
  }
}
