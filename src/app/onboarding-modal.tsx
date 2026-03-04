"use client";

import { useState } from "react";

type OnboardingData = {
  key: string;
  token: string;
  participant: unknown;
  event: unknown;
};

type Props = {
  data: OnboardingData;
  onComplete: () => void;
};

const TOTAL_STEPS = 5;

export default function OnboardingModal({ data, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data.key);
      setCopied(true);
      setKeySaved(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: user can manually select */
    }
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 min-h-[480px] flex flex-col">
          {/* Step content */}
          <div className="flex-1">
            {step === 0 && <StepSecretKey secretKey={data.key} copied={copied} onCopy={handleCopy} />}
            {step === 1 && <StepSetup />}
            {step === 2 && <StepTierSystem />}
            {step === 3 && <StepChallengeWorkflow />}
            {step === 4 && <StepReady />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <div>
              {step > 0 && (
                <button
                  onClick={prev}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            <span className="text-xs text-muted-foreground">
              {step + 1} / {TOTAL_STEPS}
            </span>

            <div>
              {step === 0 && (
                <button
                  onClick={next}
                  disabled={!keySaved}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Next
                </button>
              )}
              {step > 0 && step < TOTAL_STEPS - 1 && (
                <button
                  onClick={next}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Next
                </button>
              )}
              {step === TOTAL_STEPS - 1 && (
                <button
                  onClick={onComplete}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Let&apos;s Go!
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 0: Secret Key ─── */
function StepSecretKey({
  secretKey,
  copied,
  onCopy,
}: {
  secretKey: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">&#x1f511;</div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome to the <span className="text-primary">AI Coding CTF</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your account has been created. First things first — save your secret key.
        </p>
      </div>

      <div className="bg-card border-2 border-primary/50 rounded-lg p-6 space-y-4">
        <p className="text-sm font-medium text-center text-muted-foreground">
          Your Secret Key
        </p>
        <div className="bg-background border border-input rounded-md p-4 text-center">
          <code className="text-2xl font-mono tracking-widest text-primary select-all">
            {secretKey}
          </code>
        </div>
        <button
          onClick={onCopy}
          className="w-full py-2.5 px-4 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
      </div>

      <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
        <p className="text-sm text-destructive font-medium text-center">
          Save this key now! You&apos;ll need it to log back in. It will not be shown again.
        </p>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Copy your key to continue.
      </p>
    </div>
  );
}

/* ─── Step 1: Setup Instructions ─── */
function StepSetup() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3">&#x1f4bb;</div>
        <h2 className="text-2xl font-bold tracking-tight">Environment Setup</h2>
        <p className="mt-2 text-muted-foreground">
          Everything you need is built into the challenge platform.
        </p>
      </div>

      <div className="space-y-4">
        <SetupStep
          num={1}
          title="Prerequisites"
          description="Make sure you have Python 3.11+ and pip installed. You'll also need an AI coding assistant (Cursor, Claude Code, GitHub Copilot, etc.)."
        />

        <SetupStep
          num={2}
          title="Download Starter Code"
          description="Each challenge that requires code has a download button on its card. Click it to get a ZIP with everything you need — README, starter files, requirements, and a test suite."
        />

        <SetupStep
          num={3}
          title="Install & Solve"
        >
          <p className="text-sm text-muted-foreground mt-1">
            Unzip, then for each challenge:
          </p>
          <code className="block bg-background border border-input rounded-md p-3 text-sm font-mono text-muted-foreground mt-2 select-all overflow-x-auto">
            cd challenge-folder
            <br />
            pip install -r requirements.txt
          </code>
          <p className="text-sm text-muted-foreground mt-2">
            Read the included <code className="text-primary">README.md</code>, solve the challenge, and submit your flag through this platform.
          </p>
        </SetupStep>

        <SetupStep
          num={4}
          title="API Key (Challenges 8 & 9 only)"
        >
          <p className="text-sm text-muted-foreground mt-1">
            Two challenges require an <code className="text-primary">ANTHROPIC_API_KEY</code> environment variable. Set it in your shell or in a <code className="text-primary">.env</code> file inside the challenge folder before running those challenges.
          </p>
        </SetupStep>
      </div>
    </div>
  );
}

function SetupStep({
  num,
  title,
  description,
  children,
}: {
  num: number;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{num}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─── Step 2: Tier System ─── */
function StepTierSystem() {
  const tiers = [
    { tier: 1, name: "Circuit Initiate", color: "text-sky-400", bg: "bg-sky-500/20", border: "border-sky-500/30", rule: "Available immediately", difficulty: "Warm-Up" },
    { tier: 2, name: "Data Weaver", color: "text-teal-400", bg: "bg-teal-500/20", border: "border-teal-500/30", rule: "Complete ALL Tier 1 challenges", difficulty: "Easy" },
    { tier: 3, name: "Neural Architect", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", rule: "Complete 2+ Tier 2 challenges", difficulty: "Medium" },
    { tier: 4, name: "Algorithm Sentinel", color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", rule: "Complete 2+ Tier 3 challenges", difficulty: "Hard" },
    { tier: 5, name: "Quantum Sage", color: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-500/30", rule: "Complete 2+ Tier 4 challenges", difficulty: "Expert" },
    { tier: 6, name: "Singularity Vanguard", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", rule: "Complete 2+ Tier 5 challenges", difficulty: "Master" },
    { tier: 7, name: "Omniscient Apex", color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", rule: "Complete ALL Tier 6 challenges", difficulty: "Legendary" },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3">&#x1f3c6;</div>
        <h2 className="text-2xl font-bold tracking-tight">The Tier System</h2>
        <p className="mt-2 text-muted-foreground">
          Challenges are organized into 7 tiers. Solve challenges to unlock higher tiers.
        </p>
      </div>

      <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className={`flex items-center gap-3 rounded-lg border ${t.border} ${t.bg} px-4 py-2.5`}
          >
            <div className={`shrink-0 w-8 h-8 rounded-full bg-background/50 flex items-center justify-center font-bold text-sm ${t.color}`}>
              {t.tier}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-sm ${t.color}`}>{t.name}</span>
                <span className="text-xs text-muted-foreground">({t.difficulty})</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.rule}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> You don&apos;t need to complete every challenge in a tier to progress — tiers 3–6 only require 2 solves from the tier below. Focus on the challenges that play to your strengths.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Hints:</strong> Tier 4+ challenges have optional hints that cost points (-100 to -500 each). Tiers 1–3 have no hints — you&apos;re on your own!
        </p>
      </div>
    </div>
  );
}

/* ─── Step 3: Challenge Workflow ─── */
function StepChallengeWorkflow() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3">&#x1f9e9;</div>
        <h2 className="text-2xl font-bold tracking-tight">How Challenges Work</h2>
        <p className="mt-2 text-muted-foreground">
          Each challenge is a self-contained coding problem. Here&apos;s the flow.
        </p>
      </div>

      <div className="space-y-4">
        <WorkflowItem
          icon={<FolderIcon />}
          title="Challenge Directories"
          description="Each challenge lives in its own numbered folder (01-hello-ai, 02-bug-squash, etc.) with its own README and requirements.txt."
        />

        <WorkflowItem
          icon={<DownloadIcon />}
          title="Starter Code"
          description="Challenges that require code have a download button on their card. The ZIP includes everything: README, starter files, requirements.txt, and tests."
        />

        <WorkflowItem
          icon={<TerminalIcon />}
          title="Solve & Submit"
          description="Read the challenge README, install its dependencies (pip install -r requirements.txt), solve it, and submit your flag through this platform. Some challenges auto-submit when tests pass."
        />

        <WorkflowItem
          icon={<AIIcon />}
          title="AI Assistants Encouraged"
          description="This is an AI coding challenge — you're expected to use AI tools! Cursor, Claude Code, GitHub Copilot, or any other AI assistant is fair game."
        />
      </div>
    </div>
  );
}

function WorkflowItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ─── Step 4: Ready ─── */
function StepReady() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">&#x1f680;</div>
        <h2 className="text-2xl font-bold tracking-tight">You&apos;re All Set!</h2>
        <p className="mt-2 text-muted-foreground">
          Here&apos;s a quick reference to keep handy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickRefCard
          title="Scoring"
          items={[
            "Higher tiers = more points",
            "50–1000 pts per challenge",
            "No penalty for wrong answers",
            "Tier 4+ hints cost points (-100 to -500)",
          ]}
        />
        <QuickRefCard
          title="Tips"
          items={[
            "Start with Tier 1 warm-ups",
            "Read the README carefully",
            "Use your AI assistant!",
            "Quality over quantity",
          ]}
        />
        <QuickRefCard
          title="Per Challenge"
          items={[
            "Download ZIP from challenge card",
            "pip install -r requirements.txt",
            "Read the README.md",
            "Solve, test, submit flag",
          ]}
        />
        <QuickRefCard
          title="Remember"
          items={[
            "Everything is in the ZIP download",
            "ANTHROPIC_API_KEY for #8 & #9",
            "Some challenges auto-submit",
            "Tier 7 = endgame glory",
          ]}
        />
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-md p-4 text-center">
        <p className="text-sm font-medium text-primary">
          Nobody finishes everything — focus on having fun and learning.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Good luck, and may the best coder win!
        </p>
      </div>
    </div>
  );
}

function QuickRefCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
            <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Icons ─── */

function FolderIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
