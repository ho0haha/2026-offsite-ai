"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, joinCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      // Store session in localStorage
      localStorage.setItem("ctf-participant", JSON.stringify(data.participant));
      localStorage.setItem("ctf-event", JSON.stringify(data.event));

      router.push("/challenges");
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-primary">AI Coding</span> CTF
          </h1>
          <p className="mt-2 text-muted-foreground">
            Yum! Brands Engineering Leadership Offsite
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="space-y-4 bg-card border border-border rounded-lg p-6"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-1"
            >
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium mb-1"
            >
              Event Code
            </label>
            <input
              id="code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter event code"
              required
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring uppercase tracking-widest text-center text-lg font-mono"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Joining..." : "Join Competition"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Ask the facilitator for the event code
        </p>
      </div>
    </div>
  );
}
