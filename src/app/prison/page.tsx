"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TerminalLine {
  type: "command" | "response" | "system" | "error";
  text: string;
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

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ctf-token");
    }
    return null;
  };

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  const addLine = useCallback(
    (type: TerminalLine["type"], text: string) => {
      setLines((prev) => [...prev, { type, text }]);
      setTimeout(scrollToBottom, 50);
    },
    [scrollToBottom]
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

  // No auto-start — game starts after boot sequence

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      bootTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || isLoading || cooldown > 0) return;

    setInput("");

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
    playBootTone();

    const bootLines: { delay: number; text: string }[] = [
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

    bootTimeoutsRef.current = bootLines.map(({ delay, text }) =>
      setTimeout(() => addLine("system", text), delay)
    );

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
              className="flex-1 overflow-y-auto px-3 py-2 font-mono text-sm z-10 min-h-0"
            >
              {lines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap mb-1 text-green-500">
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
                  <span className="text-green-500 font-mono text-xs">
                    PRISON TERMINAL v1.0
                  </span>
                  <span className="text-green-700 font-mono text-xs">
                    |
                  </span>
                  <span className="text-green-600 font-mono text-xs">
                    Turns: {turnsRemaining}/200
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {escaped && flag && !flagSubmitted && (
                    <button
                      onClick={submitFlag}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-600 text-black font-mono text-xs font-bold rounded transition-colors"
                    >
                      SUBMIT FLAG
                    </button>
                  )}
                  {gameOver && (
                    <button
                      onClick={() => {
                        const token = getToken();
                        if (token) startGame(token, true);
                      }}
                      className="px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-400 font-mono text-xs rounded border border-green-700 transition-colors"
                    >
                      RESTART
                    </button>
                  )}
                  <a
                    href="/challenges"
                    className="text-green-700 hover:text-green-500 font-mono text-xs transition-colors"
                  >
                    [Back]
                  </a>
                </div>
              </div>

              {/* Terminal output */}
              <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto px-3 py-2 font-mono text-sm z-10 min-h-0"
                onClick={() => inputRef.current?.focus()}
              >
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap mb-1 ${
                      line.type === "command"
                        ? "text-green-300"
                        : line.type === "error"
                        ? "text-red-400"
                        : line.type === "system"
                        ? "text-yellow-400"
                        : "text-green-500"
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
                {isLoading && (
                  <div className="text-green-700 animate-pulse">Processing...</div>
                )}
              </div>

              {/* Cooldown bar */}
              {cooldown > 0 && (
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
                <span className="text-green-500 font-mono">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || (cooldown > 0 && !gameOver)}
                  placeholder={
                    cooldown > 0
                      ? `Wait ${cooldown}s...`
                      : gameOver
                      ? "Type RESTART to play again"
                      : "Enter command..."
                  }
                  className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none placeholder-green-800 caret-green-400"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
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
