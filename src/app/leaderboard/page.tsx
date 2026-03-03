"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type LeaderboardEntry = {
  name: string;
  totalPoints: number | null;
};

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Confetti effect */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: [
                  "#e11d48",
                  "#f59e0b",
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                ][i % 5],
                animation: `fall ${1.5 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(110vh) rotate(720deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}

      {/* Header */}
      <header className="text-center py-6 px-4">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-primary">AI Coding</span> CTF
        </h1>
        {eventName && (
          <p className="text-xl text-muted-foreground mt-1">{eventName}</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Timer */}
      {endsAt && (
        <div className="text-center mb-6">
          <div
            className={`text-6xl font-mono font-bold ${
              timeLeft === "TIME'S UP!"
                ? "text-red-400 animate-pulse"
                : "text-foreground"
            }`}
          >
            {timeLeft}
          </div>
          <p className="text-sm text-muted-foreground mt-1">remaining</p>
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

            return (
              <div
                key={entry.name}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isChanged ? "animate-rank-up" : ""
                } ${
                  rank === 1 && points > 0
                    ? "bg-yellow-500/10 border border-yellow-500/30"
                    : rank === 2 && points > 0
                      ? "bg-gray-400/10 border border-gray-400/30"
                      : rank === 3 && points > 0
                        ? "bg-amber-700/10 border border-amber-700/30"
                        : "bg-card border border-border"
                }`}
              >
                {/* Rank */}
                <div className="w-10 text-center shrink-0">
                  {rank === 1 && points > 0 ? (
                    <span className="text-2xl">&#127942;</span>
                  ) : rank === 2 && points > 0 ? (
                    <span className="text-2xl">&#129352;</span>
                  ) : rank === 3 && points > 0 ? (
                    <span className="text-2xl">&#129353;</span>
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {rank}
                    </span>
                  )}
                </div>

                {/* Name + Bar */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {entry.name}
                  </div>
                  <div className="mt-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold">{points}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    pts
                  </span>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-2xl font-semibold">Waiting for players...</p>
              <p className="mt-2">
                Participants will appear here once they join
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
