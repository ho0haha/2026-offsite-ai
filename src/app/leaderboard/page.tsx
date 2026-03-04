"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TIER_BADGES } from "@/lib/tier-badges";

type LeaderboardEntry = {
  name: string;
  totalPoints: number | null;
  maxTier: number;
};

function getBadge(tier: number) {
  return TIER_BADGES[Math.max(0, Math.min(tier - 1, TIER_BADGES.length - 1))];
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}

function LeaderboardContent() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [eventName, setEventName] = useState("");
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [connected, setConnected] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const prevPointsRef = useRef<Map<string, number>>(new Map());
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const searchParams = useSearchParams();

  const fetchLeaderboard = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/leaderboard?eventId=${eventId}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();

      if (data.event) {
        setEventName(data.event.name);
        setEndsAt(data.event.endsAt);
      }

      // Track rank changes for animation
      const newRanks = new Map<string, number>();
      const newPoints = new Map<string, number>();
      data.leaderboard.forEach((entry: LeaderboardEntry, idx: number) => {
        newRanks.set(entry.name, idx);
        newPoints.set(entry.name, entry.totalPoints ?? 0);
      });

      const changed = new Set<string>();
      newRanks.forEach((newRank, name) => {
        const oldRank = prevRanksRef.current.get(name);
        if (oldRank !== undefined && oldRank !== newRank) {
          changed.add(name);
        }
      });

      // Detect point increases for confetti
      let pointsIncreased = false;
      newPoints.forEach((pts, name) => {
        const oldPts = prevPointsRef.current.get(name);
        if (oldPts !== undefined && pts > oldPts) {
          pointsIncreased = true;
        }
      });

      prevRanksRef.current = newRanks;
      prevPointsRef.current = newPoints;

      if (changed.size > 0) {
        setChangedIds(changed);
        setTimeout(() => setChangedIds(new Set()), 1000);
      }

      if (pointsIncreased) {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3000);
      }

      setLeaderboard(data.leaderboard);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    let eventId = searchParams.get("eventId");
    if (!eventId) {
      const stored = localStorage.getItem("ctf-event");
      if (stored) {
        eventId = JSON.parse(stored).id;
      }
    }
    if (!eventId) return;

    // Initial fetch
    fetchLeaderboard(eventId);

    // Poll every 3 seconds
    const interval = setInterval(() => fetchLeaderboard(eventId), 3000);
    return () => clearInterval(interval);
  }, [searchParams, fetchLeaderboard]);

  // Countdown timer
  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("TIME'S UP!");
        clearInterval(timer);
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        hrs > 0
          ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
          : `${mins}:${String(secs).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const maxPoints = Math.max(
    1,
    ...leaderboard.map((e) => e.totalPoints ?? 0)
  );

  // Determine urgency for countdown glow
  const getTimerUrgency = () => {
    if (!endsAt) return "normal";
    if (timeLeft === "TIME'S UP!") return "ended";
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 300000) return "critical"; // last 5 min
    if (diff <= 600000) return "warning"; // last 10 min
    return "normal";
  };

  const timerUrgency = getTimerUrgency();

  // Parse time segments for digital clock display
  const getTimeSegments = () => {
    if (timeLeft === "TIME'S UP!" || !timeLeft) return null;
    const parts = timeLeft.split(":");
    if (parts.length === 3) {
      return { hrs: parts[0], mins: parts[1], secs: parts[2] };
    }
    return { hrs: null, mins: parts[0], secs: parts[1] };
  };

  const timeSegments = getTimeSegments();

  // Compute elapsed progress
  const getElapsedProgress = () => {
    if (!endsAt) return 0;
    const endTime = new Date(endsAt).getTime();
    const diff = endTime - Date.now();
    if (diff <= 0) return 100;
    // Estimate total duration from event data (assume max 4 hours)
    const totalDuration = 4 * 3600000;
    const elapsed = totalDuration - diff;
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  // Check for token to show back link
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ctf-token");

  // Confetti shapes
  const confettiShapes = ["square", "triangle", "circle"] as const;
  const confettiColors = ["#00e5ff", "#e040fb", "#3d5afe", "#00e676", "#ffd740", "#ff4081", "#7c4dff", "#18ffff"];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Confetti effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Flash effect */}
          <div className="absolute inset-0 bg-white/10" style={{ animation: "confetti-flash 0.4s ease-out forwards" }} />
          {Array.from({ length: 80 }).map((_, i) => {
            const shape = confettiShapes[i % confettiShapes.length];
            const color = confettiColors[i % confettiColors.length];
            const left = `${Math.random() * 100}%`;
            const delay = `${Math.random() * 0.8}s`;
            const duration = `${1.5 + Math.random() * 2.5}s`;
            const size = 6 + Math.random() * 8;
            const wobble = Math.random() > 0.5 ? "confetti-wobble-left" : "confetti-wobble-right";

            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left,
                  top: "-5%",
                  animation: `fall ${duration} ease-in forwards, ${wobble} ${duration} ease-in-out forwards`,
                  animationDelay: delay,
                }}
              >
                {shape === "circle" && (
                  <div
                    className="rounded-full"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      animation: `confetti-spin ${duration} linear forwards`,
                      animationDelay: delay,
                    }}
                  />
                )}
                {shape === "square" && (
                  <div
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      borderRadius: 1,
                      animation: `confetti-spin ${duration} linear forwards`,
                      animationDelay: delay,
                    }}
                  />
                )}
                {shape === "triangle" && (
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: `${size / 2}px solid transparent`,
                      borderRight: `${size / 2}px solid transparent`,
                      borderBottom: `${size}px solid ${color}`,
                      animation: `confetti-spin ${duration} linear forwards`,
                      animationDelay: delay,
                    }}
                  />
                )}
              </div>
            );
          })}
          <style>{`
            @keyframes confetti-spin {
              to { transform: rotate(${360 + Math.random() * 720}deg); }
            }
            @keyframes confetti-wobble-left {
              0% { margin-left: 0; }
              25% { margin-left: -30px; }
              50% { margin-left: 15px; }
              75% { margin-left: -10px; }
              100% { margin-left: 5px; }
            }
            @keyframes confetti-wobble-right {
              0% { margin-left: 0; }
              25% { margin-left: 30px; }
              50% { margin-left: -15px; }
              75% { margin-left: 10px; }
              100% { margin-left: -5px; }
            }
            @keyframes confetti-flash {
              0% { opacity: 0.6; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Header */}
      <header className="text-center py-8 px-4 relative">
        {/* Back link */}
        {hasToken && (
          <a
            href="/challenges"
            className="absolute top-4 left-4 flex items-center gap-1.5 text-sm font-mono-brand text-muted-foreground hover:text-[hsl(var(--accent-cyan))] transition-colors duration-300"
          >
            <span className="text-[hsl(var(--accent-cyan))]">&lt;</span> Back to Challenges
          </a>
        )}

        {/* Circuit line decorations */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="hidden sm:flex items-center gap-1 flex-1 justify-end">
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-[hsl(var(--accent-cyan)/0.4)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent-cyan)/0.6)]" />
            <div className="w-8 h-px bg-[hsl(var(--accent-cyan)/0.4)]" />
            <div className="w-2 h-2 rotate-45 border border-[hsl(var(--accent-cyan)/0.4)]" />
          </div>

          {/* Hex decoration */}
          <div className="hidden sm:block">
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" className="text-[hsl(var(--accent-cyan))] opacity-40">
              <path d="M8 1L15 5V13L8 17L1 13V5L8 1Z" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight font-display">
            <span className="animate-text-shimmer">AI Coding</span>{" "}
            <span className="text-[hsl(var(--accent-cyan))] neon-text">CTF</span>
          </h1>

          <div className="hidden sm:block">
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none" className="text-[hsl(var(--accent-magenta))] opacity-40">
              <path d="M8 1L15 5V13L8 17L1 13V5L8 1Z" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="hidden sm:flex items-center gap-1 flex-1">
            <div className="w-2 h-2 rotate-45 border border-[hsl(var(--accent-magenta)/0.4)]" />
            <div className="w-8 h-px bg-[hsl(var(--accent-magenta)/0.4)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent-magenta)/0.6)]" />
            <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-[hsl(var(--accent-magenta)/0.4)]" />
          </div>
        </div>

        {/* Event name as terminal session */}
        {eventName && (
          <p className="font-mono-brand text-sm text-muted-foreground mt-2">
            <span className="text-[hsl(var(--accent-green))]">session</span>
            <span className="text-[hsl(var(--accent-cyan))]">:</span>{" "}
            <span className="text-foreground/80">{eventName}</span>
            <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[hsl(var(--accent-cyan))] animate-typing-cursor opacity-60" />
          </p>
        )}

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="relative flex items-center">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-[hsl(var(--accent-green))]" : "bg-red-400"
              }`}
            />
            {connected && (
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-[hsl(var(--accent-green))] animate-ping opacity-40" />
            )}
          </span>
          <span className={`text-xs font-mono-brand tracking-wider uppercase ${
            connected ? "text-[hsl(var(--accent-green))]" : "text-red-400"
          }`}>
            {connected ? "LIVE" : "DISCONNECTED"}
          </span>
        </div>
      </header>

      {/* Timer */}
      {endsAt && (
        <div className="text-center mb-8 px-4">
          {timeLeft === "TIME'S UP!" ? (
            <div className="inline-block">
              <div className="text-5xl sm:text-7xl font-mono-brand font-bold text-red-500 animate-pulse neon-text-magenta tracking-wider">
                TIME&apos;S UP!
              </div>
              <style>{`
                @keyframes times-up-glow {
                  0%, 100% { text-shadow: 0 0 10px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3), 0 0 80px rgba(239,68,68,0.15); }
                  50% { text-shadow: 0 0 20px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.5), 0 0 100px rgba(239,68,68,0.3); }
                }
              `}</style>
            </div>
          ) : timeSegments ? (
            <div className="inline-flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                {timeSegments.hrs !== null && (
                  <>
                    <TimerDigitGroup value={timeSegments.hrs} label="HRS" urgency={timerUrgency} />
                    <span className={`text-3xl sm:text-4xl font-mono-brand font-bold ${
                      timerUrgency === "critical" ? "text-red-400" : timerUrgency === "warning" ? "text-amber-400" : "text-[hsl(var(--accent-cyan))]"
                    } opacity-60 animate-pulse`}>:</span>
                  </>
                )}
                <TimerDigitGroup value={timeSegments.mins} label="MIN" urgency={timerUrgency} />
                <span className={`text-3xl sm:text-4xl font-mono-brand font-bold ${
                  timerUrgency === "critical" ? "text-red-400" : timerUrgency === "warning" ? "text-amber-400" : "text-[hsl(var(--accent-cyan))]"
                } opacity-60 animate-pulse`}>:</span>
                <TimerDigitGroup value={timeSegments.secs} label="SEC" urgency={timerUrgency} />
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs h-1 rounded-full bg-secondary/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${getElapsedProgress()}%`,
                    background: timerUrgency === "critical"
                      ? "linear-gradient(90deg, hsl(var(--accent-cyan)), #ef4444)"
                      : timerUrgency === "warning"
                        ? "linear-gradient(90deg, hsl(var(--accent-cyan)), #f59e0b)"
                        : "linear-gradient(90deg, hsl(var(--accent-cyan)), hsl(var(--accent-magenta)))",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Leaderboard */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-8">
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => {
            const rank = idx + 1;
            const points = entry.totalPoints ?? 0;
            const barWidth = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
            const isChanged = changedIds.has(entry.name);
            const badge = getBadge(entry.maxTier);
            const isTop3 = rank <= 3 && points > 0;
            const prevRank = prevRanksRef.current.get(entry.name);
            const rankDir = prevRank !== undefined ? (prevRank > idx ? "up" : prevRank < idx ? "down" : null) : null;

            // Rank-specific styles for top 3
            const rankStyles = rank === 1 && points > 0
              ? "border-amber-400/50 bg-amber-500/5 shadow-[0_0_20px_rgba(251,191,36,0.15)] p-4"
              : rank === 2 && points > 0
                ? "border-slate-300/40 bg-slate-300/5 shadow-[0_0_15px_rgba(148,163,184,0.1)] p-4"
                : rank === 3 && points > 0
                  ? "border-orange-400/40 bg-orange-500/5 shadow-[0_0_15px_rgba(251,146,60,0.1)] p-4"
                  : "p-3";

            return (
              <div key={entry.name}>
                {/* Divider between top 3 and rest */}
                {rank === 4 && (
                  <div className="flex items-center gap-3 my-4 px-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-cyan)/0.2)] to-transparent" />
                    <span className="text-[10px] font-mono-brand text-muted-foreground/50 uppercase tracking-widest">rankings</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-cyan)/0.2)] to-transparent" />
                  </div>
                )}

                <div
                  className={`relative flex items-center gap-3 rounded-lg glass card-hover transition-all duration-300 ${
                    isChanged ? "animate-rank-up" : ""
                  } ${rankStyles}`}
                  style={{
                    animation: isChanged
                      ? undefined
                      : `fade-in-up 0.5s ease-out ${idx * 0.06}s both`,
                  }}
                >
                  {/* Gradient border for top 3 */}
                  {rank === 1 && points > 0 && (
                    <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 rounded-lg animate-border-glow opacity-60" style={{ padding: "1px", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
                    </div>
                  )}

                  {/* Rank */}
                  <div className="w-10 text-center shrink-0 relative">
                    {rank === 1 && points > 0 ? (
                      <span className="text-2xl inline-block animate-float">&#127942;</span>
                    ) : rank === 2 && points > 0 ? (
                      <span className="text-2xl">&#129352;</span>
                    ) : rank === 3 && points > 0 ? (
                      <span className="text-2xl">&#129353;</span>
                    ) : (
                      <span className="text-base font-mono-brand font-bold text-muted-foreground">
                        #{rank}
                      </span>
                    )}
                    {/* Rank change arrow */}
                    {isChanged && rankDir && (
                      <span className={`absolute -right-1 top-0 text-[10px] font-bold ${
                        rankDir === "up" ? "text-[hsl(var(--accent-green))]" : "text-red-400"
                      }`}>
                        {rankDir === "up" ? "\u25B2" : "\u25BC"}
                      </span>
                    )}
                  </div>

                  {/* Tier Badge Icon */}
                  <div className="shrink-0 relative group">
                    <img
                      src={badge.imageSm}
                      alt={badge.name}
                      width={isTop3 ? 48 : 40}
                      height={isTop3 ? 48 : 40}
                      className="rounded-md"
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 glass-strong rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 neon-border">
                      <span className={badge.color}>{badge.name}</span>
                      <span className="text-muted-foreground ml-1.5">Tier {entry.maxTier}</span>
                    </div>
                  </div>

                  {/* Name + Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${isTop3 ? "text-base" : "text-sm"}`}>
                        {entry.name}
                      </span>
                      <span className={`text-[10px] font-mono-brand font-medium px-1.5 py-0.5 rounded ${badge.bgColor} ${badge.color}`}>
                        T{entry.maxTier}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 bg-secondary/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${barWidth}%`,
                          background: "linear-gradient(90deg, hsl(var(--accent-cyan)), hsl(var(--accent-magenta)))",
                          boxShadow: barWidth > 0 ? "0 0 8px hsl(var(--accent-cyan) / 0.4), 0 0 20px hsl(var(--accent-cyan) / 0.15)" : "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <span className={`font-mono-brand font-bold ${isTop3 ? "text-2xl" : "text-xl"} neon-text`}
                      style={{
                        textShadow: `0 0 7px hsl(var(--accent-cyan) / 0.4), 0 0 15px hsl(var(--accent-cyan) / 0.2)`,
                      }}
                    >
                      {points}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1 font-mono-brand">
                      pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-20 relative">
              {/* Radar animation */}
              <div className="mx-auto w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 rounded-full border border-[hsl(var(--accent-cyan)/0.15)]" />
                <div className="absolute inset-3 rounded-full border border-[hsl(var(--accent-cyan)/0.1)]" />
                <div className="absolute inset-6 rounded-full border border-[hsl(var(--accent-cyan)/0.08)]" />
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 origin-center"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--accent-cyan) / 0.15) 30deg, transparent 60deg)",
                      animation: "radar-sweep 2.5s linear infinite",
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent-cyan))] animate-pulse" />
                </div>
              </div>
              <p className="font-mono-brand text-lg text-[hsl(var(--accent-cyan))]">
                <span className="text-muted-foreground">&gt;</span> awaiting_connections
                <span className="inline-block w-2 h-5 ml-0.5 align-middle bg-[hsl(var(--accent-cyan))] animate-typing-cursor" />
              </p>
              <p className="mt-2 text-sm text-muted-foreground font-mono-brand">
                Participants will appear here once they join
              </p>
              <style>{`
                @keyframes radar-sweep {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 px-4 border-t border-[hsl(var(--foreground)/0.05)]">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40 font-mono-brand">
          <span className="text-[hsl(var(--accent-cyan)/0.3)]">//</span>
          <span>Powered by AI</span>
          <span className="text-[hsl(var(--accent-cyan)/0.3)]">//</span>
        </div>
        {/* Hex ticker */}
        <div className="mt-2 overflow-hidden h-3 relative">
          <div className="hex-ticker whitespace-nowrap text-[10px] font-mono-brand text-muted-foreground/20 tracking-widest">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="inline-block mr-6">
                {Array.from({ length: 8 }).map(() =>
                  Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
                ).join(" ")}
              </span>
            ))}
          </div>
          <style>{`
            .hex-ticker {
              animation: hex-scroll 30s linear infinite;
            }
            @keyframes hex-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      </footer>
    </div>
  );
}

/** Timer digit group component for digital clock display */
function TimerDigitGroup({ value, label, urgency }: { value: string; label: string; urgency: string }) {
  const colorClass = urgency === "critical"
    ? "text-red-400 border-red-500/30 bg-red-500/5"
    : urgency === "warning"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
      : "text-[hsl(var(--accent-cyan))] border-[hsl(var(--accent-cyan)/0.2)] bg-[hsl(var(--accent-cyan)/0.05)]";

  const glowClass = urgency === "critical"
    ? "shadow-[0_0_15px_rgba(239,68,68,0.3),0_0_30px_rgba(239,68,68,0.15)]"
    : urgency === "warning"
      ? "shadow-[0_0_10px_rgba(245,158,11,0.2)]"
      : "shadow-[0_0_10px_hsl(var(--accent-cyan)/0.15)]";

  const pulseClass = urgency === "critical" ? "animate-pulse" : "";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex gap-1 ${pulseClass}`}>
        {value.split("").map((digit, i) => (
          <div
            key={i}
            className={`w-10 h-14 sm:w-14 sm:h-[72px] flex items-center justify-center rounded-lg border font-mono-brand text-3xl sm:text-5xl font-bold ${colorClass} ${glowClass} transition-all duration-300`}
          >
            {digit}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-mono-brand text-muted-foreground tracking-[0.2em] uppercase">{label}</span>
    </div>
  );
}
