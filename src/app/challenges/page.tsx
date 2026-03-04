"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TIER_BADGES } from "@/lib/tier-badges";

// ─── Rank-Up Sound Effect ───

function playRankUpSound() {
  try {
    const audio = new Audio("/rankup.mp3");
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {
    // Audio playback not available
  }
}

// ─── Rank-Up Overlay Component ───

function RankUpOverlay({
  newTier,
  unlockedChallenges,
  onDismiss,
}: {
  newTier: number;
  unlockedChallenges: { tier: number; title: string; id: string }[];
  onDismiss: () => void;
}) {
  const badge = TIER_BADGES[Math.max(0, Math.min(newTier - 1, TIER_BADGES.length - 1))];
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (!soundPlayed.current) {
      soundPlayed.current = true;
      playRankUpSound();
    }
  }, []);

  // Particle positions (pre-computed for deterministic layout)
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 80 + (i % 3) * 40;
    return {
      px: Math.cos(angle) * dist,
      py: Math.sin(angle) * dist,
      delay: i * 0.03 + 0.4,
      size: 3 + (i % 3) * 2,
    };
  });

  // Light rays
  const rays = Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * 360,
    delay: i * 0.04 + 0.3,
  }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
      onClick={onDismiss}
      style={{ animation: "rankup-overlay-in 0.4s ease-out forwards" }}
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* White flash */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{ animation: "rankup-flash 0.8s ease-out 0.45s forwards", opacity: 0 }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        {/* Expanding rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-32 h-32 rounded-full border-2 pointer-events-none"
            style={{
              borderColor: `hsl(${badge.color.includes("sky") ? "var(--accent-cyan)" : badge.color.includes("teal") ? "170 80% 50%" : badge.color.includes("blue") ? "220 90% 60%" : badge.color.includes("purple") ? "270 80% 60%" : badge.color.includes("violet") ? "260 80% 60%" : badge.color.includes("amber") ? "40 90% 55%" : "350 80% 60%"} / 0.4)`,
              animation: `rankup-ring-expand 1.2s ease-out ${0.5 + i * 0.2}s forwards`,
              opacity: 0,
            }}
          />
        ))}

        {/* Light rays */}
        <div className="absolute w-0 h-0 pointer-events-none">
          {rays.map((ray, i) => (
            <div
              key={i}
              className="absolute origin-bottom"
              style={{
                width: "2px",
                height: "200px",
                bottom: 0,
                left: "-1px",
                background: `linear-gradient(to top, hsl(var(--accent-cyan) / 0.4), transparent)`,
                transform: `rotate(${ray.angle}deg)`,
                animation: `rankup-ray 1.5s ease-out ${ray.delay}s forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              background: i % 2 === 0 ? "hsl(var(--accent-cyan))" : "hsl(var(--accent-magenta))",
              ["--px" as string]: `${p.px}px`,
              ["--py" as string]: `${p.py}px`,
              animation: `rankup-particle 1s ease-out ${p.delay}s forwards`,
              opacity: 0,
              boxShadow: `0 0 6px ${i % 2 === 0 ? "hsl(var(--accent-cyan))" : "hsl(var(--accent-magenta))"}`,
            }}
          />
        ))}

        {/* Badge */}
        <div
          className="relative"
          style={{
            animation: "rankup-badge-enter 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both",
          }}
        >
          <img
            src={badge.image}
            alt={badge.name}
            width={160}
            height={160}
            className="rounded-2xl drop-shadow-2xl"
            style={{
              filter: `drop-shadow(0 0 30px hsl(var(--accent-cyan) / 0.5)) drop-shadow(0 0 60px hsl(var(--accent-cyan) / 0.3))`,
            }}
          />
        </div>

        {/* TIER UP text */}
        <div
          className="mt-6 font-mono text-sm tracking-[0.2em] uppercase text-muted-foreground"
          style={{ animation: "rankup-subtitle-reveal 0.6s ease-out 0.9s both" }}
        >
          Tier Promotion
        </div>

        {/* Tier name */}
        <h2
          className={`mt-2 text-3xl sm:text-4xl font-bold font-display ${badge.color}`}
          style={{
            animation: "rankup-text-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1s both",
            textShadow: `0 0 20px currentColor, 0 0 40px currentColor`,
          }}
        >
          {badge.name}
        </h2>

        {/* Tier number */}
        <div
          className="mt-1 font-mono text-lg text-muted-foreground"
          style={{ animation: "rankup-subtitle-reveal 0.6s ease-out 1.2s both" }}
        >
          Tier {newTier}
        </div>

        {/* Newly unlocked challenges */}
        {unlockedChallenges.length > 0 && (
          <div
            className="mt-8 text-center"
            style={{ animation: "rankup-challenges-reveal 0.6s ease-out 1.8s both" }}
          >
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              New Challenges Unlocked
            </p>
            <div className="space-y-1.5">
              {unlockedChallenges.map((ch) => {
                const b = TIER_BADGES[Math.max(0, Math.min(ch.tier - 1, TIER_BADGES.length - 1))];
                return (
                  <div key={ch.id} className="flex items-center gap-2 justify-center text-sm">
                    <img src={b.imageSm} alt="" width={18} height={18} className="rounded" />
                    <span className="text-foreground/80">{ch.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dismiss hint */}
        <p
          className="mt-10 text-xs font-mono text-muted-foreground/50"
          style={{ animation: "rankup-dismiss-hint 2s ease-out 2s both" }}
        >
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}

type HintMeta = {
  text?: string;
  cost: number;
  revealed: boolean;
};

type Challenge = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty: string;
  points: number;
  tier: number;
  hints?: HintMeta[] | null;
  effectivePoints?: number;
  totalHintCost?: number;
  sortOrder: number;
  starterUrl?: string | null;
  solved?: boolean;
  validationType?: string | null;
  solveCount?: number;
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
  speedBonus: number;
  solvesByTier: Record<string, number>;
  totalByTier: Record<string, number>;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400 border border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border border-red-500/30",
  legendary:
    "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/50 shadow-[0_0_8px_rgba(232,121,249,0.3)] animate-pulse-subtle",
};

const DIFFICULTY_PREFIX: Record<string, string> = {
  easy: "[E]",
  medium: "[M]",
  hard: "[H]",
  legendary: "[!!]",
};

function getNextBonus(solveCount: number): { label: string; color: string } | null {
  if (solveCount === 0) return { label: "1st solve: +30%", color: "text-amber-300 bg-amber-500/15 border-amber-500/30" };
  if (solveCount === 1) return { label: "2nd solve: +20%", color: "text-amber-400/80 bg-amber-500/10 border-amber-500/20" };
  if (solveCount === 2) return { label: "3rd solve: +10%", color: "text-amber-400/60 bg-amber-500/8 border-amber-500/15" };
  return null;
}

function getBadge(tier: number) {
  return TIER_BADGES[Math.max(0, Math.min(tier - 1, TIER_BADGES.length - 1))];
}

export default function ChallengesPage() {
  const [tiers, setTiers] = useState<TierGroup[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Record<string, { correct: boolean; message: string }>
  >({});
  const [revealingHint, setRevealingHint] = useState<string | null>(null);
  const [participant, setParticipant] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rankUpData, setRankUpData] = useState<{
    newTier: number;
    challenges: { tier: number; title: string; id: string }[];
  } | null>(null);
  const prevTierRef = useRef<number | null>(null);
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
      // Detect tier-up from polling (external submissions)
      const newMaxTier = data.progress?.currentMaxTier;
      if (
        prevTierRef.current !== null &&
        newMaxTier > prevTierRef.current &&
        !rankUpData // don't overwrite an active rank-up animation
      ) {
        // Gather newly unlocked challenges from the new tiers
        const newlyUnlocked: { tier: number; title: string; id: string }[] = [];
        for (const tierGroup of data.tiers) {
          if (tierGroup.tier > prevTierRef.current && tierGroup.tier <= newMaxTier) {
            for (const ch of tierGroup.challenges) {
              newlyUnlocked.push({ tier: tierGroup.tier, title: ch.title, id: ch.id });
            }
          }
        }
        if (newlyUnlocked.length > 0) {
          setRankUpData({ newTier: newMaxTier, challenges: newlyUnlocked });
        }
      }
      setTiers(data.tiers);
      setProgress(data.progress);
    }
  }, [router, rankUpData]);

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

  // Poll for challenge state updates and tier transitions (e.g. from external agent submissions)
  useEffect(() => {
    if (!participant) return;
    const interval = setInterval(fetchChallenges, 5000);
    return () => clearInterval(interval);
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
        const newlyUnlocked = data.newlyUnlocked as { tier: number; title: string; id: string }[] | undefined;
        if (newlyUnlocked && newlyUnlocked.length > 0) {
          // Determine the new max tier from unlocked challenges
          const newMaxTier = Math.max(...newlyUnlocked.map((c) => c.tier));
          if (prevTierRef.current !== null && newMaxTier > prevTierRef.current) {
            setRankUpData({ newTier: newMaxTier, challenges: newlyUnlocked });
          }
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

  async function handleRevealHint(challengeId: string, hintIndex: number, cost: number) {
    const confirmed = window.confirm(
      `Reveal this hint for -${cost} pts? This will reduce your score for this challenge.`
    );
    if (!confirmed) return;

    const token = getToken();
    if (!token) return;

    setRevealingHint(`${challengeId}-${hintIndex}`);
    try {
      const res = await fetch("/api/hints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ challengeId, hintIndex }),
      });

      if (res.ok) {
        fetchChallenges();
      }
    } catch {
      // silently fail
    } finally {
      setRevealingHint(null);
    }
  }

  // Track tier changes
  useEffect(() => {
    if (progress) {
      if (prevTierRef.current === null) {
        // Initial load - just store, don't trigger rank-up
        prevTierRef.current = progress.currentMaxTier;
      } else {
        prevTierRef.current = progress.currentMaxTier;
      }
    }
  }, [progress]);

  const currentBadge = progress ? getBadge(progress.currentMaxTier) : getBadge(1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-strong border-b border-transparent"
        style={{ borderImage: "linear-gradient(90deg, hsl(var(--accent-cyan)), hsl(var(--accent-magenta)), hsl(var(--accent-cyan))) 1" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Current tier badge */}
            {progress && (
              <img
                src={currentBadge.image}
                alt={currentBadge.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="font-mono-brand text-cyan-400/70 text-sm">{">_"}</span>
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent animate-shimmer bg-[length:200%_auto]">
                  AI Coding
                </span>
                {" "}
                <span className="text-foreground">CTF</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {participant?.name}
                {progress && (
                  <span className={`ml-2 ${currentBadge.color} font-medium`}>
                    {currentBadge.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Tier Progress -- only show unlocked tiers */}
            {progress && (
              <div className="hidden sm:flex items-center gap-2">
                {Array.from({ length: progress.currentMaxTier }, (_, i) => i + 1).map((t) => {
                  const solved = progress.solvesByTier[String(t)] || 0;
                  const total = progress.totalByTier[String(t)] || 0;
                  const b = getBadge(t);
                  return (
                    <div
                      key={t}
                      className="text-center"
                      title={b.name}
                    >
                      <img
                        src={b.imageSm}
                        alt={b.name}
                        width={24}
                        height={24}
                        className="rounded mx-auto"
                      />
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {solved}/{total}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold font-mono neon-text text-cyan-400 tracking-wider"
                style={{ textShadow: "0 0 10px hsl(var(--accent-cyan)), 0 0 20px hsl(var(--accent-cyan))" }}>
                {progress?.totalPoints ?? 0}
                <span className="text-xs font-medium text-muted-foreground ml-1 tracking-widest">PTS</span>
              </div>
              {(progress?.speedBonus ?? 0) > 0 && (
                <div className="text-[11px] font-mono text-amber-400/80 tracking-wide"
                  style={{ textShadow: "0 0 6px rgba(251,191,36,0.3)" }}>
                  incl. +{progress!.speedBonus} speed bonus
                </div>
              )}
            </div>
            <a
              href="/leaderboard"
              className="px-3 py-1.5 text-sm font-mono border border-cyan-500/40 rounded-md hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-glow-cyan transition-all text-cyan-400"
            >
              <span className="text-cyan-600 mr-1">{">"}</span>Leaderboard
            </a>
          </div>
        </div>
        {/* Gradient separator below header */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </header>

      {/* Rank-Up Overlay */}
      {rankUpData && (
        <RankUpOverlay
          newTier={rankUpData.newTier}
          unlockedChallenges={rankUpData.challenges}
          onDismiss={() => setRankUpData(null)}
        />
      )}

      {/* Challenge Cards by Tier -- only unlocked tiers are returned */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        {tiers.map((tierGroup, tierIdx) => {
          const badge = getBadge(tierGroup.tier);
          return (
            <section key={tierGroup.tier} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${tierIdx * 100}ms`, animationFillMode: "both" }}>
              {/* Tier Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-1 h-10 rounded-full ${badge.bgColor}`}
                  style={{ boxShadow: `0 0 8px currentColor` }} />
                <img
                  src={badge.imageSm}
                  alt={badge.name}
                  width={32}
                  height={32}
                  className="rounded"
                />
                <h2 className={`text-lg font-semibold ${badge.color} flex items-center gap-2`}>
                  Tier {tierGroup.tier}
                  <span className="text-sm font-normal text-muted-foreground">
                    {badge.name}
                  </span>
                </h2>
                <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_6px_rgba(74,222,128,0.2)] animate-pulse-subtle">
                  Unlocked
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {"// "}{tierGroup.unlockRule}
                </span>
                {/* Circuit-line decoration */}
                <div className="flex-1 h-px bg-gradient-to-r from-current to-transparent opacity-20" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {tierGroup.challenges.map((ch, chIdx) => (
                  <div
                    key={ch.id}
                    className={`glass rounded-lg p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col ${
                      ch.solved
                        ? "border-l-4 border-l-green-400 shadow-[0_0_12px_rgba(74,222,128,0.15)]"
                        : `border-l-4 ${badge.borderColor}`
                    }`}
                    style={{
                      animationDelay: `${tierIdx * 100 + chIdx * 60}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        {ch.solved ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold shrink-0">
                            &#10003;
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/50 shrink-0">
                            #{String(ch.sortOrder).padStart(2, "0")}
                          </span>
                        )}
                        <span className={ch.solved ? "text-green-300/80" : ""}>
                          {ch.title}
                        </span>
                      </h3>
                      <div className="text-right ml-2 shrink-0">
                        {ch.tier >= 4 && (ch.totalHintCost ?? 0) > 0 ? (
                          <>
                            <span className="text-lg font-bold font-mono text-primary neon-text">
                              {ch.effectivePoints}
                              <span className="text-xs ml-1 text-muted-foreground">pts</span>
                            </span>
                            <span className="block text-xs text-muted-foreground line-through font-mono">
                              {ch.points} pts
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold font-mono text-primary neon-text">
                            {ch.points}
                            <span className="text-xs ml-1 text-muted-foreground">pts</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                          DIFFICULTY_COLORS[ch.difficulty] || ""
                        }`}
                      >
                        {DIFFICULTY_PREFIX[ch.difficulty] || ""} {ch.difficulty}
                      </span>
                      {ch.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/20 text-zinc-400 border border-zinc-500/20">
                          {ch.category}
                        </span>
                      )}
                      {!ch.solved && (() => {
                        const bonus = getNextBonus(ch.solveCount ?? 0);
                        return bonus ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${bonus.color}`}>
                            {bonus.label}
                          </span>
                        ) : null;
                      })()}
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
                      className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono bg-zinc-800/50 border border-zinc-700/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                    >
                      <span className="text-cyan-600">$</span>
                      <span>download starter-code.zip</span>
                      <span className="text-muted-foreground">{"\u2193"}</span>
                    </button>

                    {/* Hints -- only for tier 4+ */}
                    {ch.hints && ch.hints.length > 0 && (
                      <div className="mb-3 space-y-2">
                        <p className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1">
                          <span className="text-yellow-500">{"//>"}</span> Hints (cost points):
                        </p>
                        {ch.hints.map((hint, i) => (
                          <div key={i}>
                            {hint.revealed ? (
                              <div className="text-xs font-mono bg-green-500/5 border border-green-500/20 p-2.5 rounded">
                                <span className="text-green-500 mr-1">[DECODED]</span>
                                <span className="text-muted-foreground line-through mr-2">
                                  -{hint.cost} pts
                                </span>
                                <span className="text-green-300/80">
                                  Hint {i + 1}: {hint.text}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRevealHint(ch.id, i, hint.cost)}
                                disabled={revealingHint === `${ch.id}-${i}`}
                                className="text-xs font-mono px-3 py-1.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <span className="text-yellow-600">{"\u26A0"}</span>
                                {revealingHint === `${ch.id}-${i}`
                                  ? "Decrypting..."
                                  : `Decrypt Hint ${i + 1} (-${hint.cost} pts)`}
                                <span className="text-yellow-600/50">{"\uD83D\uDD12"}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Play button for prison escape challenge */}
                    {ch.sortOrder === 20 && !ch.solved && (
                      <a
                        href="/prison"
                        className="inline-block px-6 py-2 mt-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md text-sm font-bold transition-all mb-2 shadow-glow-cyan hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                      >
                        {"> "}Play
                      </a>
                    )}

                    {/* Flag Submission */}
                    {!ch.solved && ch.sortOrder !== 20 && (
                      <div className="flex gap-2 mt-auto pt-3">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-cyan-600 text-sm pointer-events-none">$</span>
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
                            className="w-full pl-7 pr-3 py-1.5 terminal-input rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                          />
                        </div>
                        <button
                          onClick={() => handleSubmit(ch.id)}
                          disabled={submitting === ch.id}
                          className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md text-sm font-mono font-medium hover:shadow-glow-cyan disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          {submitting === ch.id ? (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>...</span>
                            </span>
                          ) : (
                            "Submit"
                          )}
                        </button>
                      </div>
                    )}

                    {/* Fallback token submission for prison escape */}
                    {!ch.solved && ch.sortOrder === 20 && (
                      <div className="mt-2">
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground font-mono">
                            {"// "}Have a token? Submit manually
                          </summary>
                          <div className="flex gap-2 mt-2">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-cyan-600 text-sm pointer-events-none">$</span>
                              <input
                                type="text"
                                placeholder="CTF:..."
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
                                className="w-full pl-7 pr-3 py-1.5 terminal-input rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                              />
                            </div>
                            <button
                              onClick={() => handleSubmit(ch.id)}
                              disabled={submitting === ch.id}
                              className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-md text-sm font-mono font-medium hover:shadow-glow-cyan disabled:opacity-50 transition-all flex items-center gap-1"
                            >
                              {submitting === ch.id ? (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>...</span>
                                </span>
                              ) : (
                                "Submit"
                              )}
                            </button>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Result */}
                    {results[ch.id] && (
                      <p
                        className={`text-sm font-mono mt-2 ${
                          results[ch.id].correct
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                        style={{
                          textShadow: results[ch.id].correct
                            ? "0 0 8px rgba(74,222,128,0.5)"
                            : "0 0 8px rgba(248,113,113,0.5)",
                        }}
                      >
                        <span className="mr-1">
                          {results[ch.id].correct ? "[OK]" : "[ERR]"}
                        </span>
                        {results[ch.id].message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
