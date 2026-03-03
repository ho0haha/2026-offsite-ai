"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSecretKey, setNeedsSecretKey] = useState(false);
  const [onboarding, setOnboarding] = useState<{ key: string; token: string; participant: unknown; event: unknown } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // If we have a stored participant, pre-fill and show secret key field
  useEffect(() => {
    const stored = localStorage.getItem("ctf-participant");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.name) {
          setName(p.name);
          setNeedsSecretKey(true);
        }
      } catch { /* ignore */ }
    }
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, string> = { name, joinCode };
      if (needsSecretKey && secretKey) {
        body.secretKey = secretKey;
      }

      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresSecretKey) {
          setNeedsSecretKey(true);
          setError(data.error);
          return;
        }
        setError(data.error);
        return;
      }

      if (data.isNew && data.secretKey) {
        // New participant — show onboarding with secret key
        setOnboarding({
          key: data.secretKey,
          token: data.token,
          participant: data.participant,
          event: data.event,
        });
        return;
      }

      // Returning participant — go straight to challenges
      localStorage.setItem("ctf-participant", JSON.stringify(data.participant));
      localStorage.setItem("ctf-event", JSON.stringify(data.event));
      if (data.token) localStorage.setItem("ctf-token", data.token);
      router.push("/challenges");
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOnboardingComplete() {
    if (!onboarding) return;
    localStorage.setItem("ctf-participant", JSON.stringify(onboarding.participant));
    localStorage.setItem("ctf-event", JSON.stringify(onboarding.event));
    localStorage.setItem("ctf-token", onboarding.token);
    router.push("/challenges");
  }

  async function handleCopy() {
    if (!onboarding) return;
    try {
      await navigator.clipboard.writeText(onboarding.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: user can manually select */ }
  }

  // Onboarding screen — shown after first join
  if (onboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to the <span className="text-primary">CTF</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your account has been created. Save your secret key below.
            </p>
          </div>

          <div className="bg-card border-2 border-primary/50 rounded-lg p-6 space-y-4">
            <p className="text-sm font-medium text-center">Your Secret Key</p>
            <div className="bg-background border border-input rounded-md p-4 text-center">
              <code className="text-2xl font-mono tracking-widest text-primary select-all">
                {onboarding.key}
              </code>
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-2 px-4 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
              <p className="text-sm text-destructive font-medium">
                Save this key now! You will need it to log back in. It will not be shown again.
              </p>
            </div>
          </div>

          <button
            onClick={handleOnboardingComplete}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            I&apos;ve Saved My Key &mdash; Continue
          </button>
        </div>
      </div>
    );
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
            <label htmlFor="name" className="block text-sm font-medium mb-1">
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
            <label htmlFor="code" className="block text-sm font-medium mb-1">
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

          {needsSecretKey && (
            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium mb-1">
                Secret Key
              </label>
              <input
                id="secretKey"
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your secret key"
                required
                autoFocus
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring tracking-widest text-center font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The key you were given when you first joined.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Joining..." : needsSecretKey ? "Log Back In" : "Join Competition"}
          </button>

          {needsSecretKey && (
            <button
              type="button"
              onClick={() => {
                setNeedsSecretKey(false);
                setSecretKey("");
                setName("");
                setError("");
                localStorage.removeItem("ctf-participant");
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not a returning player? Join as new
            </button>
          )}
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Ask the facilitator for the event code
        </p>
      </div>
    </div>
  );
}
