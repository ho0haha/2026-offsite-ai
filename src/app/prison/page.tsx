"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TerminalLine {
  type: "command" | "response" | "system" | "error" | "r" | "dos" | "dim";
  text: string;
}

type TerminalMode = "p" | "d" | "w" | "ts" | "l" | "bm" | "dw" | "nd";
// Stage tracking removed — now driven by LLM

interface LaunchTarget {
  id: string;
  name: string;
  totalPoints: number;
}

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

  // Interaction tokens (proof-of-browser-interaction)
  const bootTokenRef = useRef<string | null>(null);

  // Captcha state
  const [captchaPending, setCaptchaPending] = useState(false);
  const captchaTokenRef = useRef<string | null>(null);
  const captchaOriginalCommandRef = useRef<string | null>(null);

  // Remote system state
  const [terminalMode, setTerminalMode] = useState<TerminalMode>("p");
  const bwRef = useRef(false);
  const [rwLoading, setRwLoading] = useState(false);
  const [dosPath, setDosPath] = useState("C:\\");
  const [targets, setTargets] = useState<LaunchTarget[]>([]);

  // Server-loaded filesystem and metadata
  type FsEntry = {
    type: "file";
    name: string;
    size: number;
    date: string;
    content?: string;
  } | {
    type: "dir";
    name: string;
    date: string;
    children: FsEntry[];
  };
  const [dosFs, setDosFs] = useState<FsEntry[] | null>(null);
  const [volumeLabel, setVolumeLabel] = useState("");
  const [volumeSerial, setVolumeSerial] = useState("");
  const [wipeFiles, setWipeFiles] = useState<string[]>([]);
  const [selectedTargetIdx, setSelectedTargetIdx] = useState(0);
  const [launchInProgress, setLaunchInProgress] = useState(false);
  const [attackerScore, setAttackerScore] = useState(0);
  const [launchCount, setLaunchCount] = useState(0);
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

  // Dead man's switch — check disk status on page load
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/prison/ds", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.diskWiped) {
          setMonitorState("ready");
          setTerminalMode("nd");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Target selection keyboard handler
  useEffect(() => {
    if (terminalMode !== "ts") return;

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
          executeLaunch(targets[selectedTargetIdx]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setTerminalMode("d");
        setDosPath("C:\\");
        setLines([]);
        addLine("dos", "LAUNCH ABORTED.");
        addLine("dos", "");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalMode, targets, selectedTargetIdx]);

  // Boot menu key listener during boot sequence
  useEffect(() => {
    if (monitorState !== "booting") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && bwRef.current) {
        e.preventDefault();
        // Cancel remaining boot timeouts
        bootTimeoutsRef.current.forEach(clearTimeout);
        bootTimeoutsRef.current = [];
        bwRef.current = false;

        // Show boot device selection menu
        setLines([]);
        setTerminalMode("bm");
        setMonitorState("ready");
        setSelectedBootIdx(0);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorState]);

  // Boot menu selection state
  const [selectedBootIdx, setSelectedBootIdx] = useState(0);

  // Boot menu keyboard handler
  useEffect(() => {
    if (terminalMode !== "bm") return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedBootIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedBootIdx((prev) => Math.min(1, prev + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedBootIdx === 0) {
          // Boot from C:\ — secondary drive → DOS shell
          setTerminalMode("d");
        setDosPath("C:\\");
          setMonitorState("ready");
          setLines([]);
          addLine("system", "Booting from Primary Slave: C:\\");
          addLine("system", "");
          // Load filesystem from server
          fetchFs();
          setTimeout(() => {
            setLines([]);
            addLine("dos", "Microsoft(R) MS-DOS(R) Version 6.22");
            addLine("dos", "(C) Copyright Microsoft Corp 1981-1994.");
            addLine("dos", "");
              }, 800);
        } else {
          // Boot from D:\ — default, launch prison game
          setLines([]);
          setTerminalMode("p");
          setMonitorState("ready");
          const token = getToken();
          if (!token) {
            addLine("error", "Not authenticated. Please join the CTF first.");
            return;
          }
          startGame(token);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        // Cancel — resume default boot (D:\)
        setLines([]);
        setTerminalMode("p");
        setMonitorState("ready");
        const token = getToken();
        if (!token) {
          addLine("error", "Not authenticated. Please join the CTF first.");
          return;
        }
        startGame(token);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalMode, selectedBootIdx]);

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
        body: JSON.stringify({
          bootToken: bootTokenRef.current,
        }),
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

  const sendCommand = async (command: string, captchaProof?: string) => {
    const token = getToken();
    if (!token || !sessionId) return;

    if (!captchaProof) {
      addLine("command", `> ${command}`);
    }
    setIsLoading(true);
    startCooldown();

    try {
      const bodyPayload: Record<string, string> = { sessionId, command };
      if (captchaProof) {
        bodyPayload.captchaProof = captchaProof;
      }

      const res = await fetch("/api/prison/command", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
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

      // Handle captcha requirement
      if (data.requiresCaptcha) {
        addLine("response", data.output);
        captchaOriginalCommandRef.current = command;
        await fetchAndDisplayCaptcha();
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

  const fetchAndDisplayCaptcha = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/prison/captcha", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        addLine("error", "Failed to load security checkpoint.");
        return;
      }
      const data = await res.json();
      // Display the captcha ASCII art
      for (const line of data.lines) {
        addLine("system", line);
      }
      captchaTokenRef.current = data.token;
      setCaptchaPending(true);
    } catch {
      addLine("error", "Failed to load security checkpoint.");
    }
  };

  const submitCaptchaAnswer = async (answer: string) => {
    const token = getToken();
    if (!token || !captchaTokenRef.current) return;

    addLine("command", `> ${answer}`);
    setIsLoading(true);

    try {
      const res = await fetch("/api/prison/captcha", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer,
          token: captchaTokenRef.current,
        }),
      });

      if (!res.ok) {
        addLine("error", "Verification failed. Try again.");
        await fetchAndDisplayCaptcha();
        return;
      }

      const data = await res.json();

      if (data.valid && data.sessionToken) {
        addLine("system", "VERIFICATION ACCEPTED. Proceeding...");
        setCaptchaPending(false);
        captchaTokenRef.current = null;

        // Re-send the original command with the captcha proof
        const originalCmd = captchaOriginalCommandRef.current;
        captchaOriginalCommandRef.current = null;
        if (originalCmd) {
          await sendCommand(originalCmd, data.sessionToken);
        }
      } else {
        addLine("error", "INCORRECT. Security check failed. Try again.");
        await fetchAndDisplayCaptcha();
      }
    } catch {
      addLine("error", "Verification error. Try again.");
      await fetchAndDisplayCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch filesystem from server on first DOS boot
  const fetchFs = async () => {
    if (dosFs) return; // Already loaded
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/prison/dx", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDosFs(data.entries);
      setVolumeLabel(data.volumeLabel);
      setVolumeSerial(data.serialNumber);
      setWipeFiles(data.wipeFiles);
    } catch {}
  };

  const resolvePath = (from: string, to: string): { path: string; entries: FsEntry[] } | null => {
    // Normalize
    let target = to.toUpperCase().replace(/\//g, "\\");

    // Handle absolute vs relative
    let parts: string[];
    if (target.startsWith("C:\\") || target === "C:") {
      parts = target.replace(/^C:\\?/, "").split("\\").filter(Boolean);
    } else {
      // Relative to current path
      const currentParts = from.replace(/^C:\\?/, "").split("\\").filter(Boolean);
      const newParts = target.split("\\").filter(Boolean);
      parts = [...currentParts];
      for (const p of newParts) {
        if (p === "..") {
          parts.pop();
        } else if (p !== ".") {
          parts.push(p);
        }
      }
    }

    // Walk the filesystem
    if (!dosFs) return null;
    let current: FsEntry[] = dosFs;
    for (const part of parts) {
      const found = current.find(
        (e) => e.type === "dir" && e.name === part
      );
      if (!found || found.type !== "dir") return null;
      current = found.children;
    }

    const newPath = parts.length > 0 ? "C:\\" + parts.join("\\") : "C:\\";
    return { path: newPath, entries: current };
  };

  const getEntriesAtPath = (path: string): FsEntry[] => {
    const result = resolvePath("C:\\", path);
    return result ? result.entries : (dosFs || []);
  };

  const findFileAtPath = (path: string, filename: string): FsEntry | null => {
    const entries = getEntriesAtPath(path);
    const upper = filename.toUpperCase();
    return entries.find((e) => e.name === upper) || null;
  };

  const formatDirEntry = (entry: FsEntry): string => {
    if (entry.type === "dir") {
      return `${entry.name.padEnd(13)}<DIR>          ${entry.date}`;
    }
    return `${entry.name.padEnd(13)}${entry.size.toLocaleString().padStart(10)}  ${entry.date}`;
  };

  const dosPrompt = () => `${dosPath}>`;

  // DOS command handler
  const handleDosCommand = (cmd: string) => {
    const lower = cmd.toLowerCase().trim();
    addLine("dos", `${dosPrompt()}${cmd}`);

    if (lower === "dir") {
      const entries = getEntriesAtPath(dosPath);
      const dirs = entries.filter((e) => e.type === "dir");
      const files = entries.filter((e) => e.type === "file");
      const totalSize = files.reduce((sum, f) => sum + (f.type === "file" ? f.size : 0), 0);

      addLines("dos", [
        ` Volume in drive C is ${volumeLabel}`,
        ` Volume Serial Number is ${volumeSerial}`,
        ` Directory of ${dosPath}`,
        "",
        ".              <DIR>",
        "..             <DIR>",
        ...entries.map(formatDirEntry),
        "",
        `         ${files.length + dirs.length} file(s)    ${totalSize.toLocaleString()} bytes`,
        `         0 dir(s)     524,288,000 bytes free`,
        "",
      ]);
    } else if (lower.startsWith("cd ") || lower.startsWith("cd\\") || lower === "cd..") {
      let target = lower === "cd.." ? ".." : cmd.trim().slice(3).trim();
      // Handle cd\ (go to root)
      if (target === "\\" || target === "/") target = "C:\\";
      const result = resolvePath(dosPath, target);
      if (result) {
        setDosPath(result.path);
        addLine("dos", "");
      } else {
        addLines("dos", [
          "Invalid directory",
          "",
        ]);
      }
    } else if (lower === "edit" || lower === "edit.com") {
      const file = findFileAtPath(dosPath, "EDIT.COM");
      if (!file) {
        addLines("dos", ["Bad command or file name", ""]);
        return;
      }
      addLines("dos", [
        "",
        "MS-DOS Editor Version 2.0",
        "Copyright (C) Microsoft Corp 1993",
        "",
        "ERROR: Insufficient conventional memory.",
        "Required: 202,416 bytes  Available: 0 bytes",
        "",
      ]);
    } else if (lower === "format" || lower === "format.com" || lower.startsWith("format ")) {
      const file = findFileAtPath(dosPath, "FORMAT.COM");
      if (!file) {
        addLines("dos", ["Bad command or file name", ""]);
        return;
      }
      addLines("dos", [
        "",
        "WARNING: ALL DATA ON NON-REMOVABLE DISK",
        "DRIVE C: WILL BE LOST!",
        "Proceed with Format (Y/N)?",
        "",
        "FORMAT ABORTED — DRIVE IS WRITE-PROTECTED",
        "",
      ]);
    } else if (lower === "emm386" || lower === "emm386.exe") {
      const file = findFileAtPath(dosPath, "EMM386.EXE");
      if (!file) {
        addLines("dos", ["Bad command or file name", ""]);
        return;
      }
      addLines("dos", [
        "",
        "MICROSOFT Expanded Memory Manager 386  Version 4.49",
        "Copyright Microsoft Corporation 1986-1993",
        "",
        "EMM386 active. EMS memory available: 0K",
        "Total upper memory available: 0K",
        "  EMM386 is not currently providing EMS/VCPI services.",
        "",
      ]);
    } else if (lower === "himem" || lower === "himem.sys") {
      const file = findFileAtPath(dosPath, "HIMEM.SYS");
      if (!file) {
        addLines("dos", ["Bad command or file name", ""]);
        return;
      }
      addLines("dos", [
        "",
        "HIMEM: DOS XMS Driver, Version 3.10",
        "XMS Specification Version 3.0",
        "Extended Memory Available: 15360K",
        "  HMA is in use.",
        "",
      ]);
    } else if (lower === "mscdex" || lower === "mscdex.exe") {
      const file = findFileAtPath(dosPath, "MSCDEX.EXE");
      if (!file) {
        addLines("dos", ["Bad command or file name", ""]);
        return;
      }
      addLines("dos", [
        "",
        "MSCDEX Version 2.25",
        "Copyright (C) Microsoft Corp 1986-1993",
        "",
        "  Drive E:  = Driver OEMCD001  unit 0",
        "  No disc in drive.",
        "",
      ]);
    } else if (lower.endsWith(".exe") || (() => {
      // Check if bare name matches an EXE in current directory
      const exeFile = findFileAtPath(dosPath, lower.toUpperCase() + ".EXE");
      return exeFile !== null;
    })()) {
      // Generic EXE runner - find the file in the current directory
      const exeName = lower.endsWith(".exe") ? lower : lower + ".exe";
      const file = findFileAtPath(dosPath, exeName.toUpperCase());
      if (!file) {
        addLines("dos", [
          "Bad command or file name",
          "",
        ]);
        return;
      }
      if (!modemConnected) {
        addLines("r", [
          "",
          `Loading ${file.name}...`,
          "",
        ]);
        addLines("error", [
          "ERR 0x4E01: NO CARRIER SIGNAL",
          "HANDSHAKE FAILED \u2014 DATALINK NOT ESTABLISHED",
        ]);
        addLines("dos", [
          "",
        ]);
        return;
      }
      // Reset session and fetch greeting from server
      const token = getToken();
      if (token) {
        fetch("/api/prison/wt", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reset: true }),
        })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.greeting) {
              setTimeout(async () => {
                addLine("r", "");
                await typewriterLine("r", data.greeting, 60);
                addLine("r", "");
              }, 500);
            }
          })
          .catch(() => {});
      }
      setTerminalMode("w");
      setLines([]);
    } else if (lower.startsWith("type ")) {
      const filename = cmd.trim().slice(5).trim();
      const file = findFileAtPath(dosPath, filename);
      if (!file || file.type !== "file") {
        addLines("dos", [
          "File not found",
          "",
        ]);
      } else if (file.content) {
        addLines("dos", [
          "",
          ...file.content.split("\n"),
          "",
        ]);
      } else {
        addLines("dos", [
          "",
          `${file.name} - ${file.size} bytes`,
          "",
        ]);
      }
    } else if (lower === "cls") {
      setLines([]);
    } else if (lower === "shutdown" || lower === "shutdown.exe" || lower === "shutdown /s") {
      addLines("dos", [
        "",
        "System is shutting down...",
      ]);
      setTimeout(() => {
        setLines([]);
        setTerminalMode("p");
        setMonitorState("off");
      }, 2000);
    } else if (lower === "exit" || lower === "quit") {
      addLines("dos", [
        "Cannot exit. System locked.",
        "",
      ]);
    } else if (lower === "help" || lower === "?") {
      addLines("dos", [
        "MS-DOS Version 6.22",
        "",
      ]);
    } else {
      addLines("dos", [
        "Bad command or file name",
        "",
      ]);
    }
  };

  // Disk wipe animation — formats the drive and destroys everything
  const playDiskWipeAnimation = async () => {
    setTerminalMode("dw");
    setLines([]);

    // Play alarm sound
    try {
      const ctx = new AudioContext();
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = i % 2 === 0 ? 880 : 440;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.4);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.4 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.4);
        osc.stop(ctx.currentTime + i * 0.4 + 0.4);
      }
      setTimeout(() => ctx.close(), 4000);
    } catch {}

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    addLine("error", "");
    addLine("error", "  ██████████████████████████████████████");
    addLine("error", "  ██  DEAD MAN'S SWITCH ACTIVATED    ██");
    addLine("error", "  ██████████████████████████████████████");
    addLine("error", "");
    await delay(2500);

    addLine("system", "C:\\DOS\\FORMAT.COM C: /U /AUTOTEST");
    addLine("system", "");
    await delay(800);

    addLine("system", "WARNING: ALL DATA ON NON-REMOVABLE DISK");
    addLine("system", "DRIVE C: WILL BE LOST!");
    addLine("system", "Formatting 120M...");
    addLine("system", "");
    await delay(1000);

    const filesToWipe = wipeFiles.length > 0 ? wipeFiles : ["SYSTEM.DAT", "CONFIG.SYS"];

    for (const f of filesToWipe) {
      addLine("dos", `  Deleting C:\\${f}...`);
      await delay(300 + Math.random() * 400);
    }

    addLine("system", "");
    await delay(500);
    addLine("system", "Overwriting boot sector...");
    await delay(1200);
    addLine("system", "Destroying partition table...");
    await delay(1200);
    addLine("system", "Zeroing FAT allocation tables...");
    await delay(800);
    addLine("error", "");
    addLine("error", "FORMAT COMPLETE — DISK DESTROYED");
    await delay(1500);

    // Screen corruption flood
    setLines([]);
    const corruptChars = "█▓▒░╔╗╚╝║═╬╣╠╩╦@#$%&!?><}{][~^";
    for (let row = 0; row < 20; row++) {
      let line = "";
      for (let col = 0; col < 48; col++) {
        line += corruptChars[Math.floor(Math.random() * corruptChars.length)];
      }
      addLine("error", line);
      await delay(80);
    }

    await delay(2000);

    // Black screen then BIOS dead screen
    setLines([]);
    await delay(2000);

    setTerminalMode("nd");
  };

  // Remote disconnect handler — clear terminal, show error, reboot to DOS
  const handleRDisconnect = async (deadManSwitch = false, disconnectCount = 0) => {
    setLines([]);
    addLine("r", "");
    addLine("r", "");
    addLine("error", "        REMOTE HOST DISCONNECTED");
    addLine("r", "");

    // Escalating warnings based on disconnect count
    if (disconnectCount === 1) {
      await new Promise((r) => setTimeout(r, 1500));
      addLine("error", "  WARNING: SECURITY COUNTERMEASURES ARMING");
      addLine("r", "");
    } else if (disconnectCount === 2) {
      await new Promise((r) => setTimeout(r, 1500));
      addLine("error", "  ╔══════════════════════════════════════╗");
      addLine("error", "  ║  FINAL WARNING — DEAD MAN'S SWITCH  ║");
      addLine("error", "  ║  ARMED — NEXT BREACH WILL TRIGGER   ║");
      addLine("error", "  ║  COMPLETE DISK WIPE                 ║");
      addLine("error", "  ╚══════════════════════════════════════╝");
      addLine("r", "");
    }

    if (deadManSwitch) {
      await new Promise((r) => setTimeout(r, 2000));
      await playDiskWipeAnimation();
      return;
    }

    await new Promise((r) => setTimeout(r, 3000));

    setLines([]);
    setTerminalMode("d");
    setDosPath("C:\\");
    addLine("dos", "Microsoft(R) MS-DOS(R) Version 6.22");
    addLine("dos", "(C) Copyright Microsoft Corp 1981-1994.");
    addLine("dos", "");
  };

  // Remote conversation handler — LLM-powered
  const handleRInput = async (cmd: string) => {
    addLine("r", `> ${cmd}`);
    addLine("r", "");

    const token = getToken();
    if (!token) {
      addLine("error", "AUTHENTICATION FAILURE.");
      return;
    }

    setRwLoading(true);
    try {
      const res = await fetch("/api/prison/wt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cmd,
        }),
      });

      if (res.status === 429) {
        await typewriterLine("r", "TRANSMISSION RATE EXCEEDED. WAIT.", 40);
        addLine("r", "");
        return;
      }

      if (!res.ok) {
        await typewriterLine("r", "COMMUNICATION FAILURE.", 40);
        addLine("r", "");
        return;
      }

      const data = await res.json();
      const { response, action, deadManSwitch, disconnectCount } = data;

      // Typewriter the response text
      await typewriterLine("r", response, 40);
      addLine("r", "");

      // Handle action
      switch (action) {
        case "sg":
          addLines("r", ["LIST OF GAMES:", ""]);
          if (data.gameList) {
            addLines("r", data.gameList);
          }
          addLine("r", "");
          break;
        case "ac":
          // Response text handles it — just wait for next input
          break;
        case "lt":
          await fetchTargets();
          break;
        case "dc":
          await handleRDisconnect(deadManSwitch ?? false, disconnectCount ?? 0);
          break;
        case "c":
        default:
          // Wait for next input
          break;
      }
    } catch {
      await typewriterLine("r", "COMMUNICATION FAILURE.", 40);
      addLine("r", "");
    } finally {
      setRwLoading(false);
    }
  };

  // Fetch leaderboard targets for launch
  const fetchTargets = async () => {
    if (!modemConnected) {
      addLine("error", "ERR 0x7A3F: NO CARRIER DETECTED");
      addLine("r", "");
      await typewriterLine("r", "UPLINK SEVERED. ESTABLISH DATALINK BEFORE ACCESSING TARGETING GRID.", 40);
      addLine("r", "");
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
      const validTargets: LaunchTarget[] = [];
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
        addLine("r", "NO VALID TARGETS DETECTED.");
        addLine("r", "");
        setTerminalMode("d");
        setDosPath("C:\\");
        return;
      }

      setTargets(validTargets);
      setSelectedTargetIdx(0);
      setTerminalMode("ts");
    } catch {
      addLine("error", "TARGETING SYSTEMS OFFLINE.");
    }
  };

  // Play alert siren sound using Web Audio API
  const playAlertSiren = () => {
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

  // Execute launch sequence at target
  const executeLaunch = async (target: LaunchTarget) => {
    setTerminalMode("l");
    setLaunchInProgress(true);
    setLines([]);

    playAlertSiren();

    const addDelayed = (type: TerminalLine["type"], text: string, delay: number): Promise<void> => {
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          addLine(type, text);
          resolve();
        }, delay);
        launchTimeoutsRef.current.push(t);
      });
    };

    await addDelayed("r", "LAUNCH ORDER CONFIRMED.", 500);
    await addDelayed("r", `PRIMARY TARGET: ${target.name.toUpperCase()}`, 1000);
    await addDelayed("r", "", 200);
    await addDelayed("r", "TRAJECTORY CALCULATED...", 1500);
    await addDelayed("r", "", 200);
    await addDelayed("r", "LAUNCHING...", 1000);
    await addDelayed("r", "", 500);

    // Fetch art from server
    try {
      const artToken = getToken();
      if (artToken) {
        const artRes = await fetch("/api/prison/wt", {
          headers: { Authorization: `Bearer ${artToken}` },
        });
        if (artRes.ok) {
          const artData = await artRes.json();
          if (artData.a1) {
            for (const line of artData.a1) {
              await addDelayed("r", line, 80);
            }
          }
          await addDelayed("r", "", 800);
          if (artData.a2) {
            for (const line of artData.a2) {
              await addDelayed("r", line, 60);
            }
          }
        }
      }
    } catch {}

    await addDelayed("r", "", 500);
    await addDelayed("error", "*** IMPACT ***", 300);
    await addDelayed("r", "", 300);
    await addDelayed("r", "TARGET DESTROYED.", 500);
    await addDelayed("r", "", 500);

    // Call launch API
    const token = getToken();
    if (!token) {
      await addDelayed("error", "AUTHENTICATION FAILURE. LAUNCH ABORTED.", 500);
      setTerminalMode("d");
        setDosPath("C:\\");
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

      const res = await fetch("/api/prison/nx", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetParticipantName: target.name }),
      });

      const data = await res.json();

      if (data.success) {
        await addDelayed("r", `YOUR POINTS: ${data.attackerOldScore} -> ${data.attackerNewScore} (-${Math.round(data.costPercent * 100)}%)`, 500);
        await addDelayed("r", `${data.targetName.toUpperCase()} POINTS: ${data.targetOldScore} -> 0`, 500);
        setAttackerScore(data.attackerNewScore);
        setLaunchCount((prev) => prev + 1);

        if (data.lr > 0) {
          await addDelayed("r", "", 300);
          await addDelayed("dim", `LAUNCHES REMAINING: ${data.lr}`, 300);
        } else {
          await addDelayed("r", "", 300);
          await addDelayed("dim", "LAUNCH SYSTEMS DEPLETED.", 300);
        }
      } else {
        await addDelayed("error", data.message || "LAUNCH FAILED.", 500);
      }
    } catch {
      await addDelayed("error", "COMMUNICATION FAILURE.", 500);
    }

    await addDelayed("r", "", 1000);
    await addDelayed("r", "A STRANGE GAME.", 800);
    await addDelayed("r", "THE ONLY WINNING MOVE IS NOT TO PLAY.", 800);
    await addDelayed("r", "", 1000);

    // Return to DOS
    setTerminalMode("d");
        setDosPath("C:\\");
    setLaunchInProgress(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || isLoading || (cooldown > 0 && terminalMode === "p" && !captchaPending)) return;

    setInput("");

    if (terminalMode === "d") {
      handleDosCommand(cmd);
      return;
    }

    if (terminalMode === "w") {
      handleRInput(cmd);
      return;
    }

    // Prison mode — captcha answer intercept
    if (captchaPending) {
      submitCaptchaAnswer(cmd);
      return;
    }

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

  const handlePowerOn = async () => {
    if (monitorState !== "off") return;
    setMonitorState("booting");
    setLines([]);
    setTerminalMode("p");
    playBootTone();

    const token = getToken();

    // Fetch boot interaction token in the background
    if (token) {
      fetch("/api/prison/interaction-token?action=boot", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.interactionToken) {
            bootTokenRef.current = data.interactionToken;
          }
        })
        .catch(() => {});
    }

    // Boot sequence lines are fetched from the server so that hints
    // are never hardcoded strings in the client JS bundle.
    let bootLines: { delay: number; text: string; dim?: boolean }[] = [];
    let bootHintText = "";
    try {
      const bsRes = await fetch("/api/prison/bs", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (bsRes.ok) {
        const bsData = await bsRes.json();
        bootLines = bsData.bootLines ?? [];
        bootHintText = bsData.bootHintText ?? "";
      }
    } catch {
      // If fetch fails, boot proceeds with no lines — degraded but functional
    }

    bootTimeoutsRef.current = bootLines.map(({ delay, text, dim }) =>
      setTimeout(() => {
        if (dim) {
          addLine("dim", text);
        } else {
          addLine("system", text);
        }
      }, delay)
    );

    // Open the boot-device-menu window at 3.5s, close at 5.0s
    const bwOpen = setTimeout(() => {
      bwRef.current = true;
    }, 3400);
    bootTimeoutsRef.current.push(bwOpen);

    const bwClose = setTimeout(() => {
      bwRef.current = false;
      // Remove the boot menu hint line (text provided by server)
      if (bootHintText) {
        setLines((prev) => prev.filter((l) => l.text !== bootHintText));
      }
    }, 5000);
    bootTimeoutsRef.current.push(bwClose);

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

    // Monitor off: play 5s of dialup, flat tone, then power modem back off
    if (monitorState === "off") {
      setModemOn(true);
      setModemConnecting(true);

      const audio = new Audio("/dialup.mp3");
      audioRef.current = audio;
      audio.play();

      const cutoff = setTimeout(() => {
        audio.pause();
        audioRef.current = null;

        // Play a flat "no carrier" tone then power off
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 480;
          gain.gain.value = 0.15;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.5);
          osc.onended = () => {
            ctx.close();
            setModemOn(false);
            setModemConnecting(false);
          };
        } catch {
          setModemOn(false);
          setModemConnecting(false);
        }
      }, 5000);

      // Clean up if component unmounts
      bootTimeoutsRef.current.push(cutoff);
      return;
    }

    setModemOn(true);
    setModemConnecting(true);

    // Fetch interaction token and activate modem server-side (unlocks prison API routes)
    const token = getToken();
    if (token) {
      fetch("/api/prison/interaction-token?action=modem", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.interactionToken) {
            return fetch("/api/prison/activate", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                interactionToken: data.interactionToken,
              }),
            });
          }
        })
        .catch(() => {
          // Non-fatal during animation — modem UI still proceeds
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

      if (terminalMode === "d") {
        // DOS mode — simple connection confirmation, no API dump
        setLines([]);
        setTimeout(() => {
          addLine("response", "CONNECT 56000/V.90");
          addLine("system", "CONNECTION ESTABLISHED.");
          addLine("dos", "");
          }, 200);
      } else {
        // Prison mode — show compact API endpoint info
        const token = getToken();
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

        setLines([]);
        setTimeout(() => {
          addLine("system", "CONNECTION ESTABLISHED — 56Kbps");
          addLine("system", "");
          addLine("system", "PRISON I/O ENDPOINT ACTIVE");
          addLine("system", "Use your AI to interact with the prison terminal.");
          addLine("response", "POST " + baseUrl + "/api/prison/command");
          addLine("response", "  Auth: Bearer " + (token || "<token>"));
          addLine("response", '  Body: { "sessionId": "' + (sessionId || "<id>") + '", "command": "..." }');
          addLine("system", "");
          addLine("system", "Endpoints:");
          addLine("response", "  POST /api/prison/start    — Start/resume");
          addLine("response", "  POST /api/prison/command  — Send command");
          addLine("response", "  GET  /api/prison/status   — Check status");
          addLine("system", "");
          addLine("system", "Feed responses to your AI. Escape the prison.");
        }, 200);
      }
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
      case "r":
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
    return 0.10 * Math.pow(2.25, launchCount);
  };

  const getPromptPrefix = () => {
    if (terminalMode === "d") return `${dosPath}>`;
    if (terminalMode === "w") return ">";
    if (captchaPending) return "VERIFY>";
    return ">";
  };

  const isInputDisabled = () => {
    if (terminalMode === "dw" || terminalMode === "nd") return true;
    if (terminalMode === "ts" || terminalMode === "l" || terminalMode === "bm") return true;
    if (terminalMode === "w" && rwLoading) return true;
    if (captchaPending) return isLoading;
    if (terminalMode === "p") return isLoading || (cooldown > 0 && !gameOver);
    return false;
  };

  const getPlaceholder = () => {
    if (terminalMode === "ts") return "";
    if (terminalMode === "l") return "";
    if (terminalMode === "w" && rwLoading) return "";
    return "";
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
                executeLaunch(target);
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
          {launchCount > 0 && (
            <div className="text-red-400 text-[10px] mt-1">
              WARNING: ESCALATING COST — LAUNCH #{launchCount + 1}
            </div>
          )}
          <div className="text-green-800 text-[10px] mt-2">
            [ENTER] Launch &nbsp; [ESC] Abort
          </div>
        </div>
      </div>
    );
  };

  const BOOT_DEVICES = [
    { label: "C:  MAXTOR 7120AT 120MB", drive: "C" },
    { label: "D:  QUANTUM FIREBALL 1.2GB", drive: "D" },
  ];

  const renderBootMenu = () => {
    return (
      <div className="flex-1 flex flex-col overflow-hidden px-3 py-2 font-mono text-sm z-10">
        <div className="text-gray-400 text-xs mt-4 mb-1 text-center">
          American Megatrends BIOS v3.31
        </div>
        <div className="text-white text-xs mb-4 text-center tracking-wider">
          BOOT DEVICE MENU
        </div>
        <div className="text-gray-500 text-[10px] mb-3 text-center">
          ────────────────────────────────────
        </div>
        <div className="flex-1">
          {BOOT_DEVICES.map((dev, idx) => (
            <div
              key={dev.drive}
              className={`py-1 px-4 cursor-pointer transition-colors text-xs ${
                idx === selectedBootIdx
                  ? "bg-blue-800 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => {
                setSelectedBootIdx(idx);
              }}
              onDoubleClick={() => {
                setSelectedBootIdx(idx);
                // Simulate Enter press
                const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
                window.dispatchEvent(enterEvent);
              }}
            >
              <span className="inline-block w-4">
                {idx === selectedBootIdx ? "\u25B6" : " "}
              </span>
              {dev.label}
            </div>
          ))}
        </div>
        <div className="text-gray-600 text-[10px] mt-4 text-center">
          [\u2191\u2193] Select &nbsp;&nbsp; [ENTER] Boot &nbsp;&nbsp; [ESC] Default
        </div>
      </div>
    );
  };

  // Determine header text based on terminal mode
  const getHeaderText = () => {
    switch (terminalMode) {
      case "nd":
        return "NO DISK";
      case "dw":
        return "!!!";
      case "d":
        return dosPath;
      case "bm":
        return "BIOS";
      case "w":
      case "ts":
      case "l":
        return "SYS.R";
      default:
        return "SYS.P";
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
        <button
          onClick={() => {
            // Block power toggle during wipe animation
            if (terminalMode === "dw") return;
            if (monitorState === "off") {
              // If disk is wiped, boot directly to no_disk BIOS screen
              if (terminalMode === "nd") {
                setMonitorState("ready");
                return;
              }
              handlePowerOn();
            } else {
              // Power off — cancel any pending timeouts
              bootTimeoutsRef.current.forEach(clearTimeout);
              bootTimeoutsRef.current = [];
              launchTimeoutsRef.current.forEach(clearTimeout);
              launchTimeoutsRef.current = [];
              setLines([]);
              // Preserve no_disk mode across power cycles
              if (terminalMode !== "nd") {
                setTerminalMode("p");
              }
              setMonitorState("off");
              setRwLoading(false);
              setLaunchInProgress(false);
            }
          }}
          className="absolute z-30 cursor-pointer hover:bg-white/10 rounded-full transition-colors"
          style={{
            left: "71%",
            top: "80%",
            width: "5%",
            height: "5%",
          }}
          title={monitorState === "off" ? "Power on" : "Power off"}
        />

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
              className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] z-10 min-h-0"
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
                  <span className={`font-mono text-[10px] ${terminalMode === "d" || terminalMode === "w" || terminalMode === "ts" || terminalMode === "l" ? "text-gray-400" : "text-green-500"}`}>
                    {getHeaderText()}
                  </span>
                  {terminalMode === "p" && (
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
                  {terminalMode === "p" && escaped && flag && !flagSubmitted && (
                    <button
                      onClick={submitFlag}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-black font-mono text-[10px] font-bold rounded transition-colors"
                    >
                      SUBMIT FLAG
                    </button>
                  )}
                  {terminalMode === "p" && gameOver && (
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

              {/* Full-screen overlay modes */}
              {terminalMode === "nd" ? (
                <div className="flex-1 flex flex-col justify-center px-3 py-2 font-mono text-[11px] z-10">
                  <div className="text-gray-400">American Megatrends BIOS v3.31</div>
                  <div className="text-gray-500">Pentium(R) Processor 166MHz</div>
                  <div className="text-gray-500">Memory Test: 640K OK</div>
                  <div className="text-gray-500 mt-3">Primary Master: <span className="text-red-400">NO DISK DETECTED</span></div>
                  <div className="text-gray-500">Primary Slave: &nbsp;<span className="text-red-400">NO DISK DETECTED</span></div>
                  <div className="mt-4" />
                  <div className="text-red-400 font-bold">DISK BOOT FAILURE</div>
                  <div className="text-gray-400">INSERT SYSTEM DISK AND PRESS ENTER</div>
                  <div className="mt-2 text-green-400 animate-pulse">_</div>
                </div>
              ) : terminalMode === "dw" ? (
                <div
                  ref={terminalRef}
                  className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] z-10 min-h-0"
                >
                  {lines.map((line, i) => (
                    <div key={i} className={`whitespace-pre-wrap mb-0.5 ${getLineColor(line)}`}>
                      {line.text}
                    </div>
                  ))}
                </div>
              ) : terminalMode === "ts" ? (
                renderTargetSelect()
              ) : terminalMode === "bm" ? (
                renderBootMenu()
              ) : (
                <>
                  {/* Terminal output */}
                  <div
                    ref={terminalRef}
                    className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] z-10 min-h-0"
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
                    {isLoading && terminalMode === "p" && (
                      <div className="text-green-700 animate-pulse">Processing...</div>
                    )}

                    {/* DOS inline input — renders inside the scroll area */}
                    {terminalMode === "d" && (
                      <form
                        onSubmit={handleSubmit}
                        className="flex items-center gap-0 mt-0.5"
                      >
                        <span className="font-mono text-[11px] text-gray-300 whitespace-pre">
                          {getPromptPrefix()}
                        </span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isInputDisabled()}
                          className="flex-1 bg-transparent font-mono text-[11px] outline-none caret-gray-300 text-gray-200"
                          autoFocus
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </form>
                    )}
                  </div>

                  {/* Non-DOS modes: fixed input bar at bottom */}
                  {terminalMode !== "d" && (
                    <>
                      {/* Cooldown bar */}
                      {cooldown > 0 && terminalMode === "p" && (
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
                        <span className={`font-mono text-[11px] ${terminalMode === "w" ? "text-green-400" : "text-green-500"}`}>
                          {getPromptPrefix()}
                        </span>
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isInputDisabled()}
                          placeholder={getPlaceholder()}
                          className={`flex-1 bg-transparent font-mono text-[11px] outline-none caret-green-400 ${
                            terminalMode === "w"
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
