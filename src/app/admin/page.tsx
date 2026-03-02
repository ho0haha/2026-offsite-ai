"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  joinCode: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

type Challenge = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  points: number;
  flag: string;
  tool: string;
  sortOrder: number;
};

type Participant = {
  id: string;
  name: string;
  totalPoints: number;
};

type Submission = {
  id: string;
  participantName: string;
  challengeTitle: string;
  submittedFlag: string;
  isCorrect: boolean;
  pointsAwarded: number;
  submittedAt: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"events" | "challenges" | "participants" | "submissions">("events");

  // Create event form
  const [newEventName, setNewEventName] = useState("");
  const [newEventCode, setNewEventCode] = useState("");

  // Timer form
  const [timerMinutes, setTimerMinutes] = useState(180);

  // Point override form
  const [overrideParticipant, setOverrideParticipant] = useState("");
  const [overridePoints, setOverridePoints] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");

  function authHeaders(): HeadersInit {
    return { Authorization: `Bearer ${password}` };
  }

  async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...init?.headers, ...authHeaders() },
    });
    if (res.status === 401) {
      setPassword("");
      setAuthError("Invalid or expired password");
    }
    return res;
  }

  useEffect(() => {
    if (password) fetchEvents();
  }, [password]);

  useEffect(() => {
    if (selectedEvent && password) {
      fetchChallenges();
      fetchParticipants();
      fetchSubmissions();
    }
  }, [selectedEvent, password]);

  async function fetchEvents() {
    const res = await authedFetch("/api/admin?action=events");
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data);
    if (data.length > 0 && !selectedEvent) {
      setSelectedEvent(data[0].id);
    }
  }

  async function fetchChallenges() {
    const res = await authedFetch(
      `/api/admin?action=challenges&eventId=${selectedEvent}`
    );
    if (!res.ok) return;
    setChallenges(await res.json());
  }

  async function fetchParticipants() {
    const res = await authedFetch(
      `/api/admin?action=participants&eventId=${selectedEvent}`
    );
    if (!res.ok) return;
    setParticipants(await res.json());
  }

  async function fetchSubmissions() {
    const res = await authedFetch(
      `/api/admin?action=submissions&eventId=${selectedEvent}`
    );
    if (!res.ok) return;
    setSubmissions(await res.json());
  }

  async function createEvent() {
    if (!newEventName) return;
    await authedFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-event",
        name: newEventName,
        joinCode: newEventCode || undefined,
      }),
    });
    setNewEventName("");
    setNewEventCode("");
    fetchEvents();
  }

  async function toggleEvent(eventId: string, isActive: boolean) {
    await authedFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-event", eventId, isActive }),
    });
    fetchEvents();
  }

  async function startTimer() {
    const now = new Date();
    const endsAt = new Date(now.getTime() + timerMinutes * 60000).toISOString();
    await authedFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-event",
        eventId: selectedEvent,
        startsAt: now.toISOString(),
        endsAt,
      }),
    });
    fetchEvents();
  }

  async function handleOverridePoints() {
    if (!overrideParticipant || overridePoints === 0) return;
    await authedFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "override-points",
        participantId: overrideParticipant,
        points: overridePoints,
        reason: overrideReason,
      }),
    });
    setOverrideParticipant("");
    setOverridePoints(0);
    setOverrideReason("");
    fetchParticipants();
  }

  if (!password) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">
            <span className="text-primary">CTF</span> Admin Login
          </h1>
          {authError && (
            <p className="text-red-400 text-sm text-center">{authError}</p>
          )}
          <input
            type="password"
            placeholder="Admin secret"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && passwordInput) {
                setAuthError("");
                setPassword(passwordInput);
                setPasswordInput("");
              }
            }}
            className="w-full px-3 py-2 bg-background border border-input rounded text-sm"
            autoFocus
          />
          <button
            onClick={() => {
              if (passwordInput) {
                setAuthError("");
                setPassword(passwordInput);
                setPasswordInput("");
              }
            }}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const currentEvent = events.find((e) => e.id === selectedEvent);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              <span className="text-primary">CTF</span> Admin
            </h1>
            {currentEvent && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Join Code:{" "}
                  <span className="font-mono font-bold text-foreground text-lg">
                    {currentEvent.joinCode}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Status:{" "}
                  <span
                    className={
                      currentEvent.isActive ? "text-green-400" : "text-red-400"
                    }
                  >
                    {currentEvent.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Event selector */}
          {events.length > 0 && (
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="mt-2 px-3 py-1 bg-background border border-input rounded text-sm"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.joinCode})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {(
            ["events", "challenges", "participants", "submissions"] as const
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Events Tab */}
        {tab === "events" && (
          <div className="space-y-6">
            {/* Create Event */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="font-semibold mb-3">Create New Event</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Event name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded text-sm flex-1 min-w-[200px]"
                />
                <input
                  type="text"
                  placeholder="Join code (auto-generated)"
                  value={newEventCode}
                  onChange={(e) => setNewEventCode(e.target.value.toUpperCase())}
                  className="px-3 py-2 bg-background border border-input rounded text-sm w-40 font-mono uppercase"
                />
                <button
                  onClick={createEvent}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Event Controls */}
            {currentEvent && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <h2 className="font-semibold">Event Controls</h2>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() =>
                      toggleEvent(currentEvent.id, !currentEvent.isActive)
                    }
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      currentEvent.isActive
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {currentEvent.isActive
                      ? "Deactivate Event"
                      : "Activate Event"}
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <label className="text-sm text-muted-foreground">
                    Timer (minutes):
                  </label>
                  <input
                    type="number"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-background border border-input rounded text-sm"
                  />
                  <button
                    onClick={startTimer}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
                  >
                    Start Timer
                  </button>
                  {currentEvent.endsAt && (
                    <span className="text-sm text-muted-foreground">
                      Ends: {new Date(currentEvent.endsAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Events list */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="font-semibold mb-3">All Events</h2>
              <div className="space-y-2">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2 rounded bg-background"
                  >
                    <div>
                      <span className="font-medium">{ev.name}</span>
                      <span className="ml-2 font-mono text-sm text-muted-foreground">
                        {ev.joinCode}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        ev.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {ev.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Challenges Tab */}
        {tab === "challenges" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Challenges ({challenges.length})
              </h2>
              <button
                onClick={fetchChallenges}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Title</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">Difficulty</th>
                    <th className="py-2 px-2">Points</th>
                    <th className="py-2 px-2">Tool</th>
                    <th className="py-2 px-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.map((ch, i) => (
                    <tr key={ch.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-2 px-2 font-medium">{ch.title}</td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {ch.category}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            ch.difficulty === "easy"
                              ? "bg-green-500/20 text-green-400"
                              : ch.difficulty === "medium"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {ch.difficulty}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono">{ch.points}</td>
                      <td className="py-2 px-2">{ch.tool}</td>
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {ch.flag}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Participants Tab */}
        {tab === "participants" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Participants ({participants.length})
              </h2>
              <button
                onClick={fetchParticipants}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-1">
              {participants.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-card border border-border rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 text-right">
                      {i + 1}.
                    </span>
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <span className="font-mono font-bold">
                    {p.totalPoints} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Point Override */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Manual Point Override</h3>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={overrideParticipant}
                  onChange={(e) => setOverrideParticipant(e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded text-sm flex-1 min-w-[150px]"
                >
                  <option value="">Select participant</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Points (+/-)"
                  value={overridePoints || ""}
                  onChange={(e) => setOverridePoints(Number(e.target.value))}
                  className="w-28 px-3 py-2 bg-background border border-input rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded text-sm flex-1 min-w-[150px]"
                />
                <button
                  onClick={handleOverridePoints}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Submissions ({submissions.length})
              </h2>
              <button
                onClick={fetchSubmissions}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-accent"
              >
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 px-2">Time</th>
                    <th className="py-2 px-2">Participant</th>
                    <th className="py-2 px-2">Challenge</th>
                    <th className="py-2 px-2">Flag</th>
                    <th className="py-2 px-2">Result</th>
                    <th className="py-2 px-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {new Date(s.submittedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-2">{s.participantName}</td>
                      <td className="py-2 px-2">{s.challengeTitle}</td>
                      <td className="py-2 px-2 font-mono text-xs max-w-[150px] truncate">
                        {s.submittedFlag}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            s.isCorrect
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {s.isCorrect ? "Correct" : "Wrong"}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono">
                        {s.pointsAwarded > 0 ? `+${s.pointsAwarded}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
