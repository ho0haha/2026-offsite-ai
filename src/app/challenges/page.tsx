"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Challenge = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  tool: string;
  hints: string[];
  sortOrder: number;
  starterUrl: string | null;
  solved: boolean;
  validationType: string | null;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

const TOOL_COLORS: Record<string, string> = {
  Cursor: "bg-blue-500/20 text-blue-400",
  "Claude Code": "bg-purple-500/20 text-purple-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  "warm-up": "Warm-Up",
  debugging: "Debugging & Diagnosis",
  refactoring: "Refactoring & Code Quality",
  "spec-to-feature": "Spec to Feature",
  "building-with-llms": "Building with LLMs",
  "advanced-mastery": "Advanced AI Tool Mastery",
  bonus: "Bonus",
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { correct: boolean; message: string }>>({});
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [participant, setParticipant] = useState<{ id: string; name: string } | null>(null);
  const [eventData, setEventData] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();

  const fetchChallenges = useCallback(async () => {
    if (!eventData || !participant) return;
    const res = await fetch(
      `/api/challenges?eventId=${eventData.id}&participantId=${participant.id}`
    );
    if (res.ok) {
      setChallenges(await res.json());
    }
  }, [eventData, participant]);

  useEffect(() => {
    const stored = localStorage.getItem("ctf-participant");
    const storedEvent = localStorage.getItem("ctf-event");
    if (!stored || !storedEvent) {
      router.push("/");
      return;
    }
    setParticipant(JSON.parse(stored));
    setEventData(JSON.parse(storedEvent));
  }, [router]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  async function handleSubmit(challengeId: string) {
    if (!participant) return;
    const flag = flagInputs[challengeId];
    if (!flag?.trim()) return;

    setSubmitting(challengeId);
    setResults((prev) => ({ ...prev, [challengeId]: undefined! }));

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          challengeId,
          flag,
        }),
      });

      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [challengeId]: { correct: data.correct, message: data.message },
      }));

      if (data.correct) {
        // Refresh challenges to update solved status
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

  // Group challenges by category
  const grouped = challenges.reduce<Record<string, Challenge[]>>(
    (acc, ch) => {
      (acc[ch.category] ||= []).push(ch);
      return acc;
    },
    {}
  );

  const categoryOrder = [
    "warm-up",
    "debugging",
    "refactoring",
    "spec-to-feature",
    "building-with-llms",
    "advanced-mastery",
    "bonus",
  ];

  const totalPoints = challenges
    .filter((c) => c.solved)
    .reduce((sum, c) => sum + c.points, 0);

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
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {totalPoints}
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

      {/* Challenge Cards */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {categoryOrder.map((cat) => {
          const catChallenges = grouped[cat];
          if (!catChallenges?.length) return null;

          return (
            <section key={cat}>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                {CATEGORY_LABELS[cat] || cat}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {catChallenges.map((ch) => (
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
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          TOOL_COLORS[ch.tool] || ""
                        }`}
                      >
                        {ch.tool}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {ch.description}
                    </p>

                    {/* Starter URL */}
                    {ch.starterUrl && (
                      <a
                        href={ch.starterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline mb-3 block"
                      >
                        Download starter code
                      </a>
                    )}

                    {/* Hints */}
                    {ch.hints.length > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() =>
                            setShowHints((prev) => ({
                              ...prev,
                              [ch.id]: Math.min(
                                (prev[ch.id] || 0) + 1,
                                ch.hints.length
                              ),
                            }))
                          }
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {(showHints[ch.id] || 0) < ch.hints.length
                            ? `Show hint (${showHints[ch.id] || 0}/${ch.hints.length})`
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
                          placeholder={ch.validationType && ch.validationType !== "flag" ? "Paste token (fallback only)..." : "FLAG{...}"}
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
            </section>
          );
        })}
      </main>
    </div>
  );
}
