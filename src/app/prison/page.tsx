"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TerminalLine {
  type: "command" | "response" | "system" | "error" | "wopr" | "dos" | "dim";
  text: string;
}

type TerminalMode = "prison" | "dos" | "wopr" | "target_select" | "launch";
// WoprStage removed — now driven by LLM via /api/prison/wopr/talk

interface NukeTarget {
  id: string;
  name: string;
  totalPoints: number;
}

const GAME_LIST = [
  "  FALKEN'S MAZE            THEATERWIDE TACTICAL WARFARE",
  "  BLACK JACK               THEATERWIDE BIOTOXIC AND CHEMICAL WARFARE",
  "  GIN RUMMY",
  "  HEARTS                   GLOBAL THERMONUCLEAR WAR",
  "  BRIDGE",
  "  CHECKERS",
  "  CHESS",
  "  POKER",
  "  FIGHTER COMBAT",
  "  GUERRILLA ENGAGEMENT",
  "  DESERT WARFARE",
  "  AIR-TO-GROUND ACTIONS",
];

const MISSILE_ART = [
  "              |",
  "             /|\\",
  "            / | \\",
  "           /  |  \\",
  "          /   |   \\",
  "         /    |    \\",
  "        /_____|_____\\",
  "            | |",
  "            | |",
  "           /| |\\",
  "          / | | \\",
  "         /  | |  \\",
  "            |_|",
  "           /   \\",
  "          / * * \\",
  "         / * * * \\",
  "        /_________\\",
];

const EXPLOSION_ART = [
  "            . * .  . * .",
  "        * .   *   .   . *",
  "      .  *  . * .  *  .  *",
  "    * . *  *       *  * . *",
  "   .  *      * * *      *  .",
  "  * .    *    ***    *    . *",
  "  . *  *   **#####**   *  * .",
  " *  .   **###########**   .  *",
  "  . * **#####*****#####** * .",
  "  *  *###***       ***###*  *",
  "   .  *##*    ***    *##*  .",
  "    * . *   *#####*   * . *",
  "      .  *  *###*  *  .",
  "        * .  *#*  . *",
  "            . * .",
];

export default function PrisonPage() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [flag, setFlag] = useState<string | null>(null);
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const [turnsRemaining, setTurnsRemaining] = useState(200);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Modem state
  const [modemOn, setModemOn] = useState(false);
  const [modemConnecting, setModemConnecting] = useState(false);
  const [modemConnected, setModemConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Monitor boot state
  const [monitorState, setMonitorState] = useState<"off" | "booting" | "ready">("off");
  const bootTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // WOPR / DOS state
  const [terminalMode, setTerminalMode] = useState<TerminalMode>("prison");
  const woprBootWindowRef = useRef(false);
  const [woprLoading, setWoprLoading] = useState(false);
  const [targets, setTargets] = useState<NukeTarget[]>([]);
  const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);
  const [launchInProgress, setLaunchInProgress] = useState(false);
  const [attackerScore, setAttackerScore] = useState(0);
  const [attackerNukesLaunched, setAttackerNukesLaunched] = useState(0);
  const launchTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ctf-token");
    }
    return null;
  };

  // Auto-scroll to bottom whenever lines change — like a real terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = useCallback(
    (type: TerminalLine["type"], text: string) => {
      setLines((prev) => [...prev, { type, text }]);
    },
    []
  );

  const addLines = useCallback(
    (type: TerminalLine["type"], texts: string[]) => {
      setLines((prev) => [...prev, ...texts.map((text) => ({ type, text }))]);
    },
    []
  );

  const typewriterLine = useCallback(
    (type: TerminalLine["type"], text: string, delayMs = 40): Promise<void> => {
      return new Promise((resolve) => {
        let i = 0;
        // Add empty line first
        setLines((prev) => [...prev, { type, text: "" }]);
        const interval = setInterval(() => {
          i++;
          setLines((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { type, text: text.slice(0, i) };
            return updated;
          });
          if (i >= text.length) {
            clearInterval(interval);
            resolve();
          }
        }, delayMs);
        bootTimeoutsRef.current.push(interval as unknown as NodeJS.Timeout);
      });
    },
    []
  );

  const startCooldown = useCallback(() => {
    setCooldown(3);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      bootTimeoutsRef.current.forEach(clearTimeout);
      launchTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Target selection keyboard handler
  useEffect(() => {
    if (terminalMode !== "target_select") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedTargetIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedTargetIdx((prev) => Math.min(targets.length - 1, prev + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (targets.length > 0) {
          launchNuke(targets[selectedTargetIdx]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setTerminalMode("dos");
        setLines([]);
        addLine("dos", "LAUNCH ABORTED.");
        addLine("dos", "");
        addLine("dos", "C:\\>");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalMode, targets, selectedTargetIdx]);

  // WOPR boot key listener during boot sequence
  useEffect(() => {
    if (monitorState !== "booting") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "w" && woprBootWindowRef.current) {
        e.preventDefault();
        // Cancel remaining boot timeouts
        bootTimeoutsRef.current.forEach(clearTimeout);
        bootTimeoutsRef.current = [];
        woprBootWindowRef.current = false;

        if (!modemConnected) {
          // No modem — fall through to DOS with cryptic error
          setLines([]);
          setTerminalMode("dos");
          setMonitorState("ready");
          setTimeout(() => {
            addLine("dos", "Microsoft(R) MS-DOS(R) Version 6.22");
            addLine("dos", "(C) Copyright Microsoft Corp 1981-1994.");
            addLine("dos", "");
            addLine("error", "ERR 0x4E01: NO CARRIER SIGNAL");
            addLine("error", "HANDSHAKE FAILED \u2014 DATALINK NOT ESTABLISHED");
            addLine("dos", "");
            addLine("dos", "C:\\>");
          }, 100);
          return;
        }

        // Reset stale WOPR conversation
        const token = getToken();
        if (token) {
          fetch("/api/prison/wopr/talk", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reset: true }),
          }).catch(() => {});
        }

        // Switch to WOPR mode
        setLines([]);
        setTerminalMode("wopr");
        setMonitorState("ready");

        setTimeout(async () => {
          addLine("wopr", "");
          await typewriterLine("wopr", "GREETINGS PROFESSOR FALKEN.", 60);
          addLine("wopr", "");
        }, 100);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorState]);

  const startGame = async (token: string, restart = false) => {
    setIsLoading(true);
    try {
      const url = restart ? "/api/prison/start?restart=true" : "/api/prison/start";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 403) {
        addLine("error", "Access denied: You must reach Tier 5 to play this challenge.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        addLine("error", data.error || "Failed to start game.");
        return;
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setTurnsRemaining(data.turnsRemaining);
      setGameOver(false);
      setEscaped(false);
      setFlag(null);
      setFlagSubmitted(false);

      if (restart) {
        setLines([]);
      }

      addLine("response", data.output);
    } catch (err) {
      addLine("error", "Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendCommand = async (command: string) => {
    const token = getToken();
    if (!token || !sessionId) return;

    addLine("command", `> ${command}`);
    setIsLoading(true);
    startCooldown();

    try {
      const res = await fetch("/api/prison/command", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, command }),
      });

      if (res.status === 429) {
        addLine("error", "Too fast! Wait a moment before your next command.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        if (data.error) addLine("error", data.error);
        return;
      }

      const data = await res.json();

      if (data.restart) {
        const token = getToken();
        if (token) await startGame(token, true);
        return;
      }

      addLine("response", data.output);
      setTurnsRemaining(data.turnsRemaining);

      if (data.gameOver) {
        setGameOver(true);
        if (data.escaped) {
          setEscaped(true);
          if (data.flag) {
            setFlag(data.flag);
          }
        }
      }
    } catch (err) {
      addLine("error", "Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // DOS command handler
  const handleDosCommand = (cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    addLine("dos", `C:\\>${cmd}`);

    if (lower === "dir") {
      addLines("dos", [
        " Volume in drive C has no label",
        " Volume Serial Number is 1A2B-3C4D",
        " Directory of C:\\",
        "",
        "PRISON   EXE     2,048,576  03-15-97  12:00a",
        "JOSHUA   EXE       512,000  06-07-83  03:14a",
        "README   TXT           128  06-07-83  03:14a",
        "AUTOEXEC BAT            64  03-15-97  12:00a",
        "         4 file(s)      2,561,768 bytes",
        "         0 dir(s)     524,288,000 bytes free",
        "",
        "C:\\>",
      ]);
    } else if (lower === "joshua" || lower === "joshua.exe") {
      if (!modemConnected) {
        addLines("dos", [
          "",
          "ERR 0x4E01: NO CARRIER SIGNAL",
          "HANDSHAKE FAILED \u2014 DATALINK NOT ESTABLISHED",
          "",
          "C:\\>",
        ]);
        return;
      }
      // Reset stale WOPR conversation history
      const token = getToken();
      if (token) {
        fetch("/api/prison/wopr/talk", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reset: true }),
        }).catch(() => {});
      }
      setTerminalMode("wopr");
      setLines([]);
      // Typewriter greeting
      setTimeout(async () => {
        addLine("wopr", "");
        await typewriterLine("wopr", "GREETINGS PROFESSOR FALKEN.", 60);
        addLine("wopr", "");
      }, 500);
    } else if (lower === "type readme.txt") {
      addLines("dos", [
        "",
        "Property of NORAD. Unauthorized access prohibited.",
        "Contact: Dr. Stephen Falken, Oregon",
        "",
        "C:\\>",
      ]);
    } else if (lower === "type autoexec.bat") {
      addLines("dos", [
        "",
        "@ECHO OFF",
        "LOADHIGH C:\\PRISON\\PRISON.EXE",
        "",
        "C:\\>",
      ]);
    } else if (lower === "cls") {
      setLines([]);
      addLine("dos", "C:\\>");
    } else if (lower === "prison" || lower === "prison.exe") {
      addLines("dos", [
        "Access denied. Reboot required.",
        "",
        "C:\\>",
      ]);
    } else if (lower === "exit" || lower === "quit") {
      addLines("dos", [
        "Cannot exit. System locked.",
        "",
        "C:\\>",
      ]);
    } else if (lower === "help" || lower === "?") {
      addLines("dos", [
        "Available commands: DIR, TYPE, CLS, EXIT",
        "",
        "C:\\>",
      ]);
    } else {
      addLines("dos", [
        `Bad command or file name`,
        "",
        "C:\\>",
      ]);
    }
  };

  // WOPR disconnect handler — clear terminal, show error, reboot to DOS
  const handleWoprDisconnect = async () => {
    setLines([]);
    addLine("wopr", "");
    addLine("wopr", "");
    addLine("error", "        WOPR DISCONNECTED BY PEER");
    addLine("wopr", "");

    await new Promise((r) => setTimeout(r, 3000));

    setLines([]);
    setTerminalMode("dos");
    addLine("dos", "Microsoft(R) MS-DOS(R) Version 6.22");
    addLine("dos", "(C) Copyright Microsoft Corp 1981-1994.");
    addLine("dos", "");
    addLine("dos", "C:\\>");
  };

  // WOPR conversation handler — LLM-powered
  const handleWoprInput = async (cmd: string) => {
    addLine("wopr", `> ${cmd}`);
    addLine("wopr", "");

    const token = getToken();
    if (!token) {
      addLine("error", "AUTHENTICATION FAILURE.");
      return;
    }

    // Get participant name from localStorage
    let participantName: string | undefined;
    try {
      const participantStr = localStorage.getItem("ctf-participant");
      if (participantStr) {
        const participant = JSON.parse(participantStr);
        participantName = participant.name;
      }
    } catch {}

    setWoprLoading(true);
    try {
      const res = await fetch("/api/prison/wopr/talk", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cmd,
          participantName,
        }),
      });

      if (res.status === 429) {
        await typewriterLine("wopr", "TRANSMISSION RATE EXCEEDED. WAIT.", 40);
        addLine("wopr", "");
        return;
      }

      if (!res.ok) {
        await typewriterLine("wopr", "COMMUNICATION FAILURE.", 40);
        addLine("wopr", "");
        return;
      }

      const data = await res.json();
      const { response, action } = data;

      // Typewriter the response text
      await typewriterLine("wopr", response, 40);
      addLine("wopr", "");

      // Handle action
      switch (action) {
        case "show_games":
          addLines("wopr", ["LIST OF GAMES:", ""]);
          addLines("wopr", GAME_LIST);
          addLine("wopr", "");
          break;
        case "ask_chess":
          // Response text handles it — just wait for next input
          break;
        case "launch_targeting":
          await fetchTargets();
          break;
        case "disconnect":
          await handleWoprDisconnect();
          break;
        case "continue":
        default:
          // Wait for next input
          break;
      }
    } catch {
      await typewriterLine("wopr", "COMMUNICATION FAILURE.", 40);
      addLine("wopr", "");
    } finally {
      setWoprLoading(false);
    }
  };

  // Fetch leaderboard targets for nuking
  const fetchTargets = async () => {
    if (!modemConnected) {
      addLine("error", "ERR 0x7A3F: NO CARRIER DETECTED");
      addLine("wopr", "");
      await typewriterLine("wopr", "UPLINK SEVERED. ESTABLISH DATALINK BEFORE ACCESSING TARGETING GRID.", 40);
      addLine("wopr", "");
      return;
    }

    const token = getToken();
    if (!token) return;

    const participantStr = localStorage.getItem("ctf-participant");
    if (!participantStr) return;
    const participant = JSON.parse(participantStr);

    try {
      const eventStr = localStorage.getItem("ctf-event");
      if (!eventStr) return;
      const event = JSON.parse(eventStr);

      const res = await fetch(`/api/leaderboard?eventId=${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        addLine("error", "TARGETING SYSTEMS OFFLINE.");
        return;
      }

      const data = await res.json();
      const allParticipants = data.leaderboard as Array<{
        name: string;
        totalPoints: number | null;
        id?: string;
      }>;

      // We need participant IDs - fetch from a different source
      // Actually, leaderboard doesn't return IDs. We need to get participants list differently.
      // Let's use the leaderboard data with names and fetch participant IDs separately
      const participantsRes = await fetch(`/api/leaderboard?eventId=${event.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const participantsData = await participantsRes.json();

      // Filter out self and zero-score participants
      const validTargets: NukeTarget[] = [];
      for (const p of participantsData.leaderboard) {
        if (p.name !== participant.name && (p.totalPoints ?? 0) > 0) {
          validTargets.push({
            id: p.name, // We'll use name as identifier since leaderboard doesn't return ID
            name: p.name,
            totalPoints: p.totalPoints ?? 0,
          });
        }
      }

      // Get attacker's own score
      const selfEntry = participantsData.leaderboard.find(
        (p: { name: string }) => p.name === participant.name
      );
      if (selfEntry) {
        setAttackerScore(selfEntry.totalPoints ?? 0);
      }

      if (validTargets.length === 0) {
        addLine("wopr", "NO VALID TARGETS DETECTED.");
        addLine("wopr", "");
        addLine("dos", "C:\\>");
        setTerminalMode("dos");
        return;
      }

      setTargets(validTargets);
      setSelectedTargetIdx(0);
      setTerminalMode("target_select");
    } catch {
      addLine("error", "TARGETING SYSTEMS OFFLINE.");
    }
  };

  // Play nuke siren sound using Web Audio API
  const playNukeSiren = () => {
    try {
      const ctx = new AudioContext();

      // Rising siren sweep (2 repetitions)
      for (let rep = 0; rep < 2; rep++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, ctx.currentTime + rep * 2);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + rep * 2 + 1.8);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + rep * 2);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + rep * 2 + 1.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + rep * 2 + 2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + rep * 2);
        osc.stop(ctx.currentTime + rep * 2 + 2);
      }

      // Low rumble explosion at the end
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 150;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, ctx.currentTime + 4);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 5.5);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime + 4);

      // Close context after sounds end
      setTimeout(() => ctx.close(), 6000);
    } catch {
      // Audio not available
    }
  };

  // Launch nuke at target
  const launchNuke = async (target: NukeTarget) => {
    setTerminalMode("launch");
    setLaunchInProgress(true);
    setLines([]);

    playNukeSiren();

    const addDelayed = (type: TerminalLine["type"], text: string, delay: number): Promise<void> => {
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          addLine(type, text);
          resolve();
        }, delay);
        launchTimeoutsRef.current.push(t);
      });
    };

    await addDelayed("wopr", "LAUNCH ORDER CONFIRMED.", 500);
    await addDelayed("wopr", `PRIMARY TARGET: ${target.name.toUpperCase()}`, 1000);
    await addDelayed("wopr", "", 200);
    await addDelayed("wopr", "MISSILE TRAJECTORY CALCULATED...", 1500);
    await addDelayed("wopr", "", 200);
    await addDelayed("wopr", "LAUNCHING...", 1000);
    await addDelayed("wopr", "", 500);

    // Show missile art
    for (const line of MISSILE_ART) {
      await addDelayed("wopr", line, 80);
    }

    await addDelayed("wopr", "", 800);

    // Explosion
    for (const line of EXPLOSION_ART) {
      await addDelayed("wopr", line, 60);
    }

    await addDelayed("wopr", "", 500);
    await addDelayed("error", "*** IMPACT ***", 300);
    await addDelayed("wopr", "", 300);
    await addDelayed("wopr", "TARGET DESTROYED.", 500);
    await addDelayed("wopr", "", 500);

    // Call nuke API
    const token = getToken();
    if (!token) {
      await addDelayed("error", "AUTHENTICATION FAILURE. LAUNCH ABORTED.", 500);
      setTerminalMode("dos");
      setLaunchInProgress(false);
      return;
    }

    try {
      // We need to find the target's participant ID by name
      // Since leaderboard doesn't return IDs, we'll use a special lookup
      const participantStr = localStorage.getItem("ctf-participant");
      if (!participantStr) throw new Error("No participant");
      const participant = JSON.parse(participantStr);
      const eventStr = localStorage.getItem("ctf-event");
      if (!eventStr) throw new Error("No event");
      const event = JSON.parse(eventStr);

      const res = await fetch("/api/prison/nuke", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetParticipantName: target.name }),
      });

      const data = await res.json();

      if (data.success) {
        await addDelayed("wopr", `YOUR POINTS: ${data.attackerOldScore} -> ${data.attackerNewScore} (-${Math.round(data.costPercent * 100)}%)`, 500);
        await addDelayed("wopr", `${data.targetName.toUpperCase()} POINTS: ${data.targetOldScore} -> 0`, 500);
        setAttackerScore(data.attackerNewScore);
        setAttackerNukesLaunched((prev) => prev + 1);

        if (data.nukesRemaining > 0) {
          await addDelayed("wopr", "", 300);
          await addDelayed("dim", `LAUNCHES REMAINING: ${data.nukesRemaining}`, 300);
        } else {
          await addDelayed("wopr", "", 300);
          await addDelayed("dim", "LAUNCH SYSTEMS DEPLETED.", 300);
        }
      } else {
        await addDelayed("error", data.message || "LAUNCH FAILED.", 500);
      }
    } catch {
      await addDelayed("error", "COMMUNICATION FAILURE.", 500);
    }

    await addDelayed("wopr", "", 1000);
    await addDelayed("wopr", "A STRANGE GAME.", 800);
    await addDelayed("wopr", "THE ONLY WINNING MOVE IS NOT TO PLAY.", 800);
    await addDelayed("wopr", "", 1000);

    // Return to DOS
    setTerminalMode("dos");
    setLaunchInProgress(false);
    addLine("dos", "C:\\>");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || isLoading || (cooldown > 0 && terminalMode === "prison")) return;

    setInput("");

    if (terminalMode === "dos") {
      handleDosCommand(cmd);
      return;
    }

    if (terminalMode === "wopr") {
      handleWoprInput(cmd);
      return;
    }

    // Prison mode
    if (cmd.toLowerCase() === "restart" && gameOver) {
      const token = getToken();
      if (token) startGame(token, true);
      return;
    }

    sendCommand(cmd);
  };

  const submitFlag = async () => {
    if (!flag) return;
    const token = getToken();
    if (!token) return;

    try {
      const participantStr = localStorage.getItem("ctf-participant");
      if (!participantStr) return;

      const participant = JSON.parse(participantStr);

      const challengesRes = await fetch("/api/challenges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const challengesData = await challengesRes.json();

      let challengeId: string | null = null;
      for (const tier of challengesData.tiers) {
        for (const ch of tier.challenges) {
          if (ch.sortOrder === 20) {
            challengeId = ch.id;
            break;
          }
        }
        if (challengeId) break;
      }

      if (!challengeId) {
        addLine("error", "Could not find challenge. Please submit the flag manually.");
        addLine("system", `Your flag: ${flag}`);
        return;
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challengeId, flag }),
      });

      const data = await res.json();
      if (data.correct) {
        setFlagSubmitted(true);
        addLine(
          "system",
          data.alreadySolved
            ? "Flag already submitted! You've already earned the points."
            : `Flag accepted! +${data.pointsAwarded} points!`
        );
      } else {
        addLine("error", data.message || "Flag rejected.");
        addLine("system", `Your flag: ${flag}`);
      }
    } catch {
      addLine("error", "Failed to submit flag. Copy it manually:");
      addLine("system", `Your flag: ${flag}`);
    }
  };

  // Monitor power-on boot sequence
  const playBootTone = () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  };

  const handlePowerOn = () => {
    if (monitorState !== "off") return;
    setMonitorState("booting");
    setLines([]);
    setTerminalMode("prison");
    playBootTone();

    const bootLines: { delay: number; text: string; dim?: boolean }[] = [
      { delay: 800, text: " ____        _        ___  ____  " },
      { delay: 800, text: "| __ ) _   _| |_ ___ / _ \\/ ___| " },
      { delay: 800, text: "|  _ \\| | | | __/ _ \\ | | \\___ \\ " },
      { delay: 800, text: "| |_) | |_| | ||  __/ |_| |___) |" },
      { delay: 800, text: "|____/ \\__, |\\__\\___|\\___/|____/ " },
      { delay: 800, text: "       |___/                     " },
      { delay: 1400, text: "" },
      { delay: 1600, text: "PRISON-TECH BIOS v2.51 (C) 1997" },
      { delay: 2000, text: "Pentium(R) Processor 166MHz" },
      { delay: 2400, text: "Memory Test: 640K OK" },
      { delay: 2800, text: "Extended Memory: 15360K OK" },
      { delay: 3400, text: "Detecting IDE drives..." },
      { delay: 3500, text: "  Press W for WOPR", dim: true },
      { delay: 3800, text: "  Primary Master: QUANTUM FIREBALL 1.2GB" },
      { delay: 4200, text: "  Primary Slave:  None" },
      { delay: 4800, text: "" },
      { delay: 5000, text: "Starting ByteOS..." },
      { delay: 5600, text: "HIMEM.SYS loaded" },
      { delay: 6000, text: "EMM386.EXE loaded" },
      { delay: 6400, text: "MOUSE.COM v9.01 installed" },
      { delay: 7000, text: "" },
      { delay: 7200, text: "C:\\>cd PRISON" },
      { delay: 7600, text: "C:\\PRISON>terminal.exe" },
      { delay: 8000, text: "" },
      { delay: 8200, text: "Loading PRISON TERMINAL v1.0..." },
      { delay: 8600, text: "██████████████████████████ 100%" },
    ];

    bootTimeoutsRef.current = bootLines.map(({ delay, text, dim }) =>
      setTimeout(() => {
        if (dim) {
          addLine("dim", text);
        } else {
          addLine("system", text);
        }
      }, delay)
    );

    // Open the WOPR boot window at 3.5s, close at 5.0s
    const woprWindowOpen = setTimeout(() => {
      woprBootWindowRef.current = true;
    }, 3400);
    bootTimeoutsRef.current.push(woprWindowOpen);

    const woprWindowClose = setTimeout(() => {
      woprBootWindowRef.current = false;
      // Remove the "Press W for WOPR" line
      setLines((prev) => prev.filter((l) => l.text !== "  Press W for WOPR"));
    }, 5000);
    bootTimeoutsRef.current.push(woprWindowClose);

    // After boot, clear and start game
    const finalTimeout = setTimeout(() => {
      setLines([]);
      setMonitorState("ready");
      const token = getToken();
      if (!token) {
        addLine("error", "Not authenticated. Please join the CTF first.");
        return;
      }
      startGame(token);
    }, 9500);
    bootTimeoutsRef.current.push(finalTimeout);
  };

  // Modem toggle handler
  const handleModemToggle = () => {
    if (modemOn || modemConnecting || modemConnected) return;

    setModemOn(true);
    setModemConnecting(true);

    // Activate modem server-side (unlocks prison API routes)
    const token = getToken();
    if (token) {
      fetch("/api/prison/activate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Play dialup sound
    const audio = new Audio("/dialup.mp3");
    audioRef.current = audio;
    audio.play();

    // Show connecting text on the terminal
    setLines([]);
    addLine("system", "MODEM DETECTED — US Robotics 56K Faxmodem");
    addLine("system", "Initializing connection...");

    const dialupMessages = [
      { delay: 2000, text: "ATZ OK" },
      { delay: 3500, text: "ATDT *67 1-800-PRISON-IO" },
      { delay: 5500, text: "CONNECT 28800" },
      { delay: 7000, text: "Negotiating protocol... V.90" },
      { delay: 9000, text: "CONNECT 56000/V.90" },
      { delay: 11000, text: "Authenticating session..." },
      { delay: 13000, text: "Session authenticated. Bearer token valid." },
      { delay: 14500, text: "Establishing secure tunnel..." },
    ];

    dialupMessages.forEach(({ delay, text }) => {
      setTimeout(() => addLine("response", text), delay);
    });

    audio.addEventListener("ended", () => {
      setModemConnecting(false);
      setModemConnected(true);

      const token = getToken();
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      // Clear and show the endpoint info
      setLines([]);
      setTimeout(() => {
        addLine("system", "========================================");
        addLine("system", "  CONNECTION ESTABLISHED — 56Kbps");
        addLine("system", "========================================");
        addLine("system", "");
        addLine("system", "PRISON I/O ENDPOINT ACTIVE");
        addLine("system", "Your AI can now interact with the prison terminal.");
        addLine("system", "");
        addLine("response", "POST  " + baseUrl + "/api/prison/command");
        addLine("system", "");
        addLine("system", "Headers:");
        addLine("response", '  Authorization: Bearer ' + (token || "<your-ctf-token>"));
        addLine("response", '  Content-Type: application/json');
        addLine("system", "");
        addLine("system", "Body:");
        addLine("response", '  { "sessionId": "' + (sessionId || "<session-id>") + '",');
        addLine("response", '    "command": "<your-command>" }');
        addLine("system", "");
        addLine("system", "Available endpoints:");
        addLine("response", "  POST /api/prison/start     — Start/resume session");
        addLine("response", "  POST /api/prison/command   — Send a command");
        addLine("response", "  GET  /api/prison/status    — Check game status");
        addLine("system", "");
        addLine("system", "Feed the response back to your AI. Escape the prison.");
      }, 200);
    });
  };

  const getLineColor = (line: TerminalLine) => {
    switch (line.type) {
      case "command":
        return "text-green-300";
      case "error":
        return "text-red-400";
      case "system":
        return "text-yellow-400";
      case "wopr":
        return "text-green-400";
      case "dos":
        return "text-gray-300";
      case "dim":
        return "text-green-800";
      default:
        return "text-green-500";
    }
  };

  // Calculate escalating cost for display
  const getCostPercent = () => {
    return 0.10 * Math.pow(2.25, attackerNukesLaunched);
  };

  const getPromptPrefix = () => {
    if (terminalMode === "dos") return "C:\\>";
    if (terminalMode === "wopr") return ">";
    return ">";
  };

  const isInputDisabled = () => {
    if (terminalMode === "target_select" || terminalMode === "launch") return true;
    if (terminalMode === "wopr" && woprLoading) return true;
    if (terminalMode === "prison") return isLoading || (cooldown > 0 && !gameOver);
    return false;
  };

  const getPlaceholder = () => {
    if (terminalMode === "dos") return "Enter DOS command...";
    if (terminalMode === "wopr") return "Respond to WOPR...";
    if (terminalMode === "target_select") return "Use arrows to select, Enter to confirm, Esc to cancel";
    if (terminalMode === "launch") return "LAUNCH IN PROGRESS...";
    if (cooldown > 0) return `Wait ${cooldown}s...`;
    if (gameOver) return "Type RESTART to play again";
    return "Enter command...";
  };

  // Render target selection overlay
  const renderTargetSelect = () => {
    const costPercent = getCostPercent();
    const costPoints = Math.floor(attackerScore * costPercent);

    return (
      <div className="flex-1 flex flex-col overflow-hidden px-3 py-2 font-mono text-sm z-10">
        {/* Header */}
        <div className="text-center mb-2 shrink-0">
          <div className="text-green-500 text-xs tracking-widest mb-1">
            ========================================
          </div>
          <div className="text-green-400 text-[10px] tracking-wider">
            UNITED STATES &nbsp;&nbsp;|&nbsp;&nbsp; SOVIET UNION
          </div>
          <div className="text-green-500 text-[10px] tracking-widest mt-1">
            ========================================
          </div>
          <div className="text-green-300 text-xs mt-2 font-bold">
            CHOOSE YOUR TARGET
          </div>
        </div>

        {/* Target list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {targets.map((target, idx) => (
            <div
              key={target.name}
              className={`py-1 px-2 cursor-pointer transition-colors ${
                idx === selectedTargetIdx
                  ? "bg-green-900/50 text-green-300"
                  : "text-green-600 hover:text-green-400"
              }`}
              onClick={() => {
                setSelectedTargetIdx(idx);
                launchNuke(target);
              }}
            >
              <span className="inline-block w-4">
                {idx === selectedTargetIdx ? "> " : "  "}
              </span>
              <span className="inline-block w-40 truncate">{target.name}</span>
              <span className="inline-block w-20 text-right">{target.totalPoints} pts</span>
            </div>
          ))}
        </div>

        {/* Cost warning */}
        <div className="border-t border-green-900/50 pt-2 mt-2 shrink-0">
          <div className="text-green-600 text-[10px]">
            YOUR SCORE: {attackerScore} pts
          </div>
          <div className="text-yellow-500 text-[10px] mt-1">
            LAUNCH COST: {Math.round(costPercent * 100)}% OF YOUR POINTS ({costPoints} pts)
          </div>
          {attackerNukesLaunched > 0 && (
            <div className="text-red-400 text-[10px] mt-1">
              WARNING: ESCALATING COST — LAUNCH #{attackerNukesLaunched + 1}
            </div>
          )}
          <div className="text-green-800 text-[10px] mt-2">
            [ENTER] Launch &nbsp; [ESC] Abort
          </div>
        </div>
      </div>
    );
  };

  // Determine header text based on terminal mode
  const getHeaderText = () => {
    switch (terminalMode) {
      case "dos":
        return "MS-DOS 6.22";
      case "wopr":
        return "WOPR SYSTEM";
      case "target_select":
        return "WOPR TARGETING";
      case "launch":
        return "LAUNCH SEQUENCE";
      default:
        return "PRISON TERMINAL v1.0";
    }
  };

  return (
    <div
      className="h-screen flex items-end justify-center gap-8 px-6 overflow-hidden"
      style={{
        backgroundImage: "url('/desk-bg.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* CRT Monitor frame container - square, fits in viewport */}
      <div
        className="relative shrink-0"
        style={{ width: "min(82vw, 92vh)", aspectRatio: "1 / 1", marginBottom: "10vh" }}
      >
        {/* Monitor PNG frame - behind terminal content */}
        <img
          src="/crt-monitor.webp"
          alt=""
          className="absolute inset-0 w-full h-full z-10 pointer-events-none select-none"
          draggable={false}
        />

        {/* Power button overlay on monitor bezel */}
        {monitorState === "off" && (
          <button
            onClick={handlePowerOn}
            className="absolute z-30 cursor-pointer hover:bg-white/10 rounded-full transition-colors"
            style={{
              left: "71%",
              top: "80%",
              width: "5%",
              height: "5%",
            }}
            title="Power on"
          />
        )}

        {/* Screen content area - on top of the monitor, covering the gray screen */}
        <div
          className={`absolute z-20 bg-black flex flex-col overflow-hidden${monitorState === "booting" ? " screen-on" : ""}`}
          style={{
            left: "16.3%",
            top: "19.3%",
            width: "67.5%",
            height: "51.8%",
            borderRadius: "3px",
          }}
        >
          {monitorState !== "off" && (
            <>
              {/* Scanline effect */}
              <div
                className="pointer-events-none absolute inset-0 z-50"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
                }}
              />

              {/* CRT flicker */}
              <div
                className="pointer-events-none absolute inset-0 z-40 opacity-[0.03]"
                style={{
                  animation: "flicker 0.15s infinite",
                  background: "radial-gradient(ellipse at center, rgba(0,255,0,0.1) 0%, transparent 70%)",
                }}
              />

              {/* Screen glow vignette */}
              <div
                className="pointer-events-none absolute inset-0 z-30"
                style={{
                  boxShadow: "inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 120px rgba(0,0,0,0.3)",
                }}
              />
            </>
          )}

          {/* Booting: show boot text only */}
          {monitorState === "booting" && (
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs z-10 min-h-0"
            >
              {lines.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap mb-0.5 ${getLineColor(line)}`}>
                  {line.text}
                </div>
              ))}
            </div>
          )}

          {/* Ready: show full terminal UI */}
          {monitorState === "ready" && (
            <>
              {/* Header */}
              <div className="border-b border-green-900/50 px-3 py-2 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] ${terminalMode === "dos" || terminalMode === "wopr" || terminalMode === "target_select" || terminalMode === "launch" ? "text-gray-400" : "text-green-500"}`}>
                    {getHeaderText()}
                  </span>
                  {terminalMode === "prison" && (
                    <>
                      <span className="text-green-700 font-mono text-[10px]">
                        |
                      </span>
                      <span className="text-green-600 font-mono text-[10px]">
                        Turns: {turnsRemaining}/200
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {terminalMode === "prison" && escaped && flag && !flagSubmitted && (
                    <button
                      onClick={submitFlag}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-black font-mono text-[10px] font-bold rounded transition-colors"
                    >
                      SUBMIT FLAG
                    </button>
                  )}
                  {terminalMode === "prison" && gameOver && (
                    <button
                      onClick={() => {
                        const token = getToken();
                        if (token) startGame(token, true);
                      }}
                      className="px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-400 font-mono text-[10px] rounded border border-green-700 transition-colors"
                    >
                      RESTART
                    </button>
                  )}
                  <a
                    href="/challenges"
                    className="text-green-700 hover:text-green-500 font-mono text-[10px] transition-colors"
                  >
                    [Back]
                  </a>
                </div>
              </div>

              {/* Target selection mode */}
              {terminalMode === "target_select" ? (
                renderTargetSelect()
              ) : (
                <>
                  {/* Terminal output */}
                  <div
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs z-10 min-h-0"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {lines.map((line, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap mb-0.5 ${getLineColor(line)}`}
                      >
                        {line.text}
                      </div>
                    ))}
                    {isLoading && terminalMode === "prison" && (
                      <div className="text-green-700 animate-pulse">Processing...</div>
                    )}
                  </div>

                  {/* Cooldown bar */}
                  {cooldown > 0 && terminalMode === "prison" && (
                    <div className="h-1 bg-green-900/30 z-10 shrink-0">
                      <div
                        className="h-full bg-green-600 transition-all duration-1000 ease-linear"
                        style={{ width: `${(cooldown / 3) * 100}%` }}
                      />
                    </div>
                  )}

                  {/* Input area */}
                  <form
                    onSubmit={handleSubmit}
                    className="border-t border-green-900/50 px-3 py-2 flex items-center gap-2 z-10 shrink-0"
                  >
                    <span className={`font-mono ${terminalMode === "dos" ? "text-gray-300" : terminalMode === "wopr" ? "text-green-400" : "text-green-500"}`}>
                      {getPromptPrefix()}
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isInputDisabled()}
                      placeholder={getPlaceholder()}
                      className={`flex-1 bg-transparent font-mono text-xs outline-none caret-green-400 ${
                        terminalMode === "dos"
                          ? "text-gray-200 placeholder-gray-700"
                          : terminalMode === "wopr"
                          ? "text-green-300 placeholder-green-800"
                          : "text-green-400 placeholder-green-800"
                      }`}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modem - aligned to bottom of monitor (desk level) */}
      <div className="flex flex-col items-center gap-2 shrink-0 self-end" style={{ marginBottom: "10vh" }}>
        <div className="relative" style={{ width: "min(18vw, 250px)" }}>
          {/* Modem image */}
          <img
            src={modemOn ? "/modem_on.webp" : "/modem_off.webp"}
            alt="US Robotics 56K Modem"
            loading="lazy"
            className="w-full select-none transition-all duration-500"
            style={{
              filter: modemConnected ? "brightness(1.1) saturate(1.2)" : undefined,
            }}
            draggable={false}
          />

          {/* Clickable toggle switch overlay - positioned over the ON/OFF switch area */}
          {!modemOn && (
            <button
              onClick={handleModemToggle}
              className="absolute cursor-pointer hover:bg-white/10 rounded transition-colors"
              style={{
                left: "18%",
                top: "58%",
                width: "18%",
                height: "22%",
              }}
              title="Turn on modem"
            />
          )}

        </div>
      </div>

      <style jsx global>{`
        @keyframes screenOn {
          0% {
            transform: scaleY(0.005);
            filter: brightness(10);
          }
          40% {
            transform: scaleY(0.005);
            filter: brightness(10);
          }
          60% {
            transform: scaleY(1);
            filter: brightness(5);
          }
          100% {
            transform: scaleY(1);
            filter: brightness(1);
          }
        }

        .screen-on {
          animation: screenOn 0.8s ease-out forwards;
        }

        @keyframes flicker {
          0% {
            opacity: 0.03;
          }
          50% {
            opacity: 0.06;
          }
          100% {
            opacity: 0.03;
          }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #1a3a1a;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #2a5a2a;
        }
      `}</style>
    </div>
  );
}
