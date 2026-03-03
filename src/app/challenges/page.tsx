"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Challenge = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty: string;
  points: number;
  tier: number;
  hints?: string[];
  sortOrder: number;
  starterUrl?: string | null;
  solved?: boolean;
  validationType?: string | null;
};

type TierGroup = {
  tier: number;
  unlocked: boolean;
  unlockRule: string;
  challenges: Challenge[];
};

type Progress = {
  currentMaxTier: number;
  totalPoints: number;
  solvesByTier: Record<string, number>;
  totalByTier: Record<string, number>;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

const TIER_COLORS: Record<number, string> = {
  1: "text-green-400",
  2: "text-yellow-400",
  3: "text-red-400",
  4: "text-purple-400",
  5: "text-pink-400",
};

export default function ChallengesPage() {
  const [tiers, setTiers] = useState<TierGroup[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Record<string, { correct: boolean; message: string }>
  >({});
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [participant, setParticipant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [unlockNotification, setUnlockNotification] = useState<
    { tier: number; title: string; id: string }[] | null
  >(null);
  const router = useRouter();

  function getToken(): string | null {
    return localStorage.getItem("ctf-token");
  }

  const fetchChallenges = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return;
    }
    const res = await fetch("/api/challenges", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("ctf-token");
      router.push("/");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setTiers(data.tiers);
      setProgress(data.progress);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem("ctf-participant");
    const storedToken = localStorage.getItem("ctf-token");
    if (!stored || !storedToken) {
      router.push("/");
      return;
    }
    setParticipant(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (participant) {
      fetchChallenges();
    }
  }, [participant, fetchChallenges]);

  async function handleSubmit(challengeId: string) {
    const token = getToken();
    if (!token) return;
    const flag = flagInputs[challengeId];
    if (!flag?.trim()) return;

    setSubmitting(challengeId);
    setResults((prev) => ({ ...prev, [challengeId]: undefined! }));

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ challengeId, flag }),
      });

      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [challengeId]: { correct: data.correct, message: data.message },
      }));

      if (data.correct) {
        if (data.newlyUnlocked?.length > 0) {
          setUnlockNotification(data.newlyUnlocked);
          setTimeout(() => setUnlockNotification(null), 8000);
        }
        fetchChallenges();
        setFlagInputs((prev) => ({ ...prev, [challengeId]: "" }));
      }
    } catch {
      setResults((prev) => ({
        ...prev,
        [challengeId]: {
          correct: false,
          message: "Submission failed. Try again.",
        },
      }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-primary">AI Coding</span> CTF
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome, {participant?.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Tier Progress */}
            {progress && (
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((t) => {
                  const solved = progress.solvesByTier[String(t)] || 0;
                  const total = progress.totalByTier[String(t)] || 0;
                  const unlocked = t <= progress.currentMaxTier;
                  return (
                    <div
                      key={t}
                      className={`text-center ${
                        unlocked ? "" : "opacity-40"
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${
                          TIER_COLORS[t] || ""
                        }`}
                      >
                        T{t}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {solved}/{total}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {progress?.totalPoints ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">points</div>
            </div>
            <a
              href="/leaderboard"
              className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              Leaderboard
            </a>
          </div>
        </div>
      </header>

      {/* Unlock Notification */}
      {unlockNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/50 rounded-lg p-4 shadow-lg max-w-md animate-in fade-in slide-in-from-top-4">
          <p className="text-green-400 font-semibold mb-2">
            New challenges unlocked!
          </p>
          {unlockNotification.map((ch) => (
            <p key={ch.id} className="text-sm text-green-300">
              Tier {ch.tier}: {ch.title}
            </p>
          ))}
        </div>
      )}

      {/* Challenge Cards by Tier */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {tiers.map((tierGroup) => (
          <section key={tierGroup.tier}>
            <div className="flex items-center gap-3 mb-3">
              <h2
                className={`text-lg font-semibold ${
                  TIER_COLORS[tierGroup.tier] || ""
                }`}
              >
                Tier {tierGroup.tier}
              </h2>
              {tierGroup.unlocked ? (
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                  Unlocked
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs bg-zinc-500/20 text-zinc-400">
                  Locked
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {tierGroup.unlockRule}
              </span>
            </div>

            {tierGroup.unlocked ? (
              <div className="grid gap-4 md:grid-cols-2">
                {tierGroup.challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className={`border rounded-lg p-4 transition-all ${
                      ch.solved
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base">
                        {ch.solved && (
                          <span className="text-green-400 mr-1">&#10003;</span>
                        )}
                        {ch.title}
                      </h3>
                      <span className="text-lg font-bold text-primary ml-2 shrink-0">
                        {ch.points} pts
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          DIFFICULTY_COLORS[ch.difficulty] || ""
                        }`}
                      >
                        {ch.difficulty}
                      </span>
                      {ch.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/20 text-zinc-400">
                          {ch.category}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {ch.description && (
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {ch.description}
                      </p>
                    )}

                    {/* Starter Download */}
                    <button
                      onClick={async () => {
                        const token = getToken();
                        if (!token) return;
                        try {
                          const res = await fetch(
                            `/api/starter/${ch.sortOrder}?format=zip`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );
                          if (!res.ok) return;
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `challenge-${ch.sortOrder}-starter.zip`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {
                          // silently fail
                        }
                      }}
                      className="text-sm text-primary underline mb-3 block text-left cursor-pointer hover:opacity-80"
                    >
                      Download starter code
                    </button>

                    {/* Hints */}
                    {ch.hints && ch.hints.length > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() =>
                            setShowHints((prev) => ({
                              ...prev,
                              [ch.id]: Math.min(
                                (prev[ch.id] || 0) + 1,
                                ch.hints!.length
                              ),
                            }))
                          }
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {(showHints[ch.id] || 0) < ch.hints.length
                            ? `Show hint (${showHints[ch.id] || 0}/${
                                ch.hints.length
                              })`
                            : `All hints shown`}
                        </button>
                        {(showHints[ch.id] || 0) > 0 && (
                          <div className="mt-2 space-y-1">
                            {ch.hints
                              .slice(0, showHints[ch.id])
                              .map((hint, i) => (
                                <p
                                  key={i}
                                  className="text-xs bg-accent/50 p-2 rounded"
                                >
                                  Hint {i + 1}: {hint}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Flag Submission */}
                    {!ch.solved && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={
                            ch.validationType &&
                            ch.validationType !== "flag"
                              ? "Paste token (fallback only)..."
                              : "FLAG{...}"
                          }
                          value={flagInputs[ch.id] || ""}
                          onChange={(e) =>
                            setFlagInputs((prev) => ({
                              ...prev,
                              [ch.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmit(ch.id);
                          }}
                          className="flex-1 px-3 py-1.5 bg-background border border-input rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={() => handleSubmit(ch.id)}
                          disabled={submitting === ch.id}
                          className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {submitting === ch.id ? "..." : "Submit"}
                        </button>
                      </div>
                    )}

                    {/* Result */}
                    {results[ch.id] && (
                      <p
                        className={`text-sm mt-2 ${
                          results[ch.id].correct
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {results[ch.id].message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Locked Tier - Show preview cards */
              <div className="grid gap-4 md:grid-cols-2 opacity-50">
                {tierGroup.challenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="border border-border/50 rounded-lg p-4 bg-card/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base text-muted-foreground">
                        {ch.title}
                      </h3>
                      <span className="text-lg font-bold text-muted-foreground ml-2 shrink-0">
                        {ch.points} pts
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          DIFFICULTY_COLORS[ch.difficulty] || ""
                        }`}
                      >
                        {ch.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
