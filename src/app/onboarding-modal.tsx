"use client";

import { useState, useEffect } from "react";

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

const TOTAL_STEPS = 7;

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
        <div className="bg-card border border-border rounded-xl p-8 max-h-[80vh] flex flex-col">
          {/* Step content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {step === 0 && <StepSecretKey secretKey={data.key} copied={copied} onCopy={handleCopy} />}
            {step === 1 && <StepEnvSetup />}
            {step === 2 && <StepSetup />}
            {step === 3 && <StepTierSystem />}
            {step === 4 && <StepChallengeWorkflow />}
            {step === 5 && <StepHowToSubmit />}
            {step === 6 && <StepReady />}
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
              {step >= 1 && step < TOTAL_STEPS - 1 && (
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

/* ─── Step 0: Secret Key + Environment Setup ─── */
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
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3 font-mono text-primary">{">"}_</div>
        <h2 className="text-2xl font-bold tracking-tight">
          Access <span className="text-primary">Granted</span>
        </h2>
        <p className="mt-2 text-muted-foreground">
          You&apos;re in. Save your secret key — it&apos;s your only way back if you lose your session.
        </p>
      </div>

      <div className="bg-card border-2 border-primary/50 rounded-lg p-5 space-y-3">
        <p className="text-sm font-medium text-center text-muted-foreground">
          Your Secret Key
        </p>
        <p className="text-xs text-center text-muted-foreground">
          Lose this and you&apos;re locked out. No resets. No recovery.
        </p>
        <div className="bg-background border border-input rounded-md p-3 text-center">
          <code className="text-2xl font-mono tracking-widest text-primary select-all">
            {secretKey}
          </code>
        </div>
        <button
          onClick={onCopy}
          className="w-full py-2 px-4 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
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
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
          <p className="text-xs text-destructive font-medium text-center font-mono">
            [WARN] This key is shown exactly once.
          </p>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Copy your key to continue.
      </p>
    </div>
  );
}

/* ─── Step 1: Environment File ─── */
function StepEnvSetup() {
  const [serverUrl, setServerUrl] = useState("");
  const [envCopied, setEnvCopied] = useState(false);

  useEffect(() => {
    setServerUrl(window.location.origin);
  }, []);

  const envBlock = `CTF_SERVER=${serverUrl}\nCTF_JOIN_CODE=YUMCTF`;

  async function handleCopyEnv() {
    try {
      await navigator.clipboard.writeText(envBlock);
      setEnvCopied(true);
      setTimeout(() => setEnvCopied(false), 2000);
    } catch {
      /* fallback: user can manually select */
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3 font-mono text-primary">$_</div>
        <h2 className="text-2xl font-bold tracking-tight">Connect to the Server</h2>
        <p className="mt-2 text-muted-foreground">
          Drop these into a <code className="text-primary">.env</code> file in your working directory.
          The included <code className="text-primary">ctf_helper.py</code> uses them to phone home.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <p className="text-sm font-medium text-center text-muted-foreground font-mono">
          .env
        </p>
        <div className="bg-background border border-input rounded-md p-3">
          <pre className="text-sm font-mono text-muted-foreground select-all whitespace-pre leading-relaxed"><span className="text-cyan-400">CTF_SERVER</span>={serverUrl}{"\n"}<span className="text-cyan-400">CTF_JOIN_CODE</span>=YUMCTF</pre>
        </div>
        <button
          onClick={handleCopyEnv}
          className="w-full py-2 px-4 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2"
        >
          {envCopied ? (
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
              Copy .env Contents
            </>
          )}
        </button>
      </div>

      <div className="bg-muted/50 border border-border rounded-md p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground font-mono">[i]</strong> <code className="text-primary">ctf_helper.py</code> ships with your first challenge download. It handles auto-submission.
        </p>
      </div>
    </div>
  );
}

/* ─── Step 2: Setup Instructions ─── */
function StepSetup() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3 font-mono text-primary">~/</div>
        <h2 className="text-2xl font-bold tracking-tight">Gear Up</h2>
        <p className="mt-2 text-muted-foreground">
          Three things between you and the first flag.
        </p>
      </div>

      <div className="space-y-4">
        <SetupStep
          num={1}
          title="Prerequisites"
          description="Python 3.11+ and pip. Plus an AI coding assistant — Cursor, Claude Code, GitHub Copilot, whatever you've got."
        />

        <SetupStep
          num={2}
          title="Download Starter Code"
          description="Each challenge card has a download button. One click gives you a ZIP with everything — README, starter files, requirements, and tests."
        />

        <SetupStep
          num={3}
          title="Install & Solve"
        >
          <p className="text-sm text-muted-foreground mt-1">
            Unzip, then:
          </p>
          <code className="block bg-background border border-input rounded-md p-3 text-sm font-mono text-muted-foreground mt-2 select-all overflow-x-auto">
            cd challenge-folder
            <br />
            pip install -r requirements.txt
          </code>
          <p className="text-sm text-muted-foreground mt-2">
            Read the <code className="text-primary">README.md</code>, solve it, submit the flag.
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
        <div className="text-4xl mb-3 font-mono text-primary">{"//"} RANKS</div>
        <h2 className="text-2xl font-bold tracking-tight">Climb the Tiers</h2>
        <p className="mt-2 text-muted-foreground">
          7 tiers. Solve challenges to unlock the next. How high can you get?
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
          <strong className="text-foreground font-mono">[i]</strong> You don&apos;t need to clear every challenge — tiers 3-6 only require 2 solves from the tier below. Play to your strengths.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground font-mono">[+]</strong> First 3 solvers of each challenge earn speed bonuses: +30%, +20%, +10%. Be fast, get rewarded.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground font-mono">[?]</strong> Tier 4+ challenges have hints you can decrypt — but they cost points. Tiers 1-3? You&apos;re on your own.
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
        <div className="text-4xl mb-3 font-mono text-primary">{"{"}&hellip;{"}"}</div>
        <h2 className="text-2xl font-bold tracking-tight">The Mission Loop</h2>
        <p className="mt-2 text-muted-foreground">
          Download. Solve. Submit. Repeat.
        </p>
      </div>

      <div className="space-y-4">
        <WorkflowItem
          icon={<FolderIcon />}
          title="Challenge Directories"
          description="Each challenge is self-contained — its own folder, its own README, its own dependencies."
        />

        <WorkflowItem
          icon={<DownloadIcon />}
          title="Starter Code"
          description="Hit the download button on any challenge card. The ZIP has everything you need."
        />

        <WorkflowItem
          icon={<TerminalIcon />}
          title="Solve & Submit"
          description="pip install, solve, submit the flag. Some challenges auto-submit when tests pass — you'll know."
        />

        <WorkflowItem
          icon={<AIIcon />}
          title="AI Assistants Encouraged"
          description="This is an AI coding challenge — using AI tools isn't just allowed, it's the point. Go wild."
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

/* ─── Step 4: How to Submit ─── */
function StepHowToSubmit() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-3 font-mono text-primary">{">>>"}</div>
        <h2 className="text-2xl font-bold tracking-tight">Submission Modes</h2>
        <p className="mt-2 text-muted-foreground">
          Three ways flags get captured. Know the difference.
        </p>
      </div>

      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
        {/* Type 1: Flag challenges */}
        <SubmitTypeCard
          label="Type 1"
          title="Flag Submission"
          color="text-cyan-400"
          bg="bg-cyan-500/10"
          border="border-cyan-500/30"
          description="Solve it, get a flag in your terminal. Paste it into the challenge card."
          steps={[
            "Solve the challenge — the flag prints to your terminal",
            <>Grab the flag (looks like <code className="text-cyan-400 text-xs">FLAG&#123;...&#125;</code> or <code className="text-cyan-400 text-xs">CTF&#123;...&#125;</code>)</>,
            "Paste it into the challenge card, hit Submit",
          ]}
        />

        {/* Type 2: Auto-submit challenges */}
        <SubmitTypeCard
          label="Type 2"
          title="Auto-Submit (Upload Validation)"
          color="text-green-400"
          bg="bg-green-500/10"
          border="border-green-500/30"
          description="Some challenges upload and validate your code server-side. Tests pass, flag lands automatically."
          steps={[
            <>Run the validation script (<code className="text-green-400 text-xs">bash run.sh</code> or <code className="text-green-400 text-xs">python -m pytest</code>)</>,
            <><code className="text-green-400 text-xs">ctf_helper.py</code> handles the submission for you</>,
            "If auto-submit fails, a fallback token is printed — paste it manually",
          ]}
        />

        {/* Type 3: Interactive challenges */}
        <SubmitTypeCard
          label="Type 3"
          title="Interactive / In-Browser"
          color="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/30"
          description="A few challenges run live on the server — murder mystery, escape room. No local files."
          steps={[
            "Hit Play on the challenge card",
            "Interact through the built-in interface or API",
            "Flag is captured automatically on completion",
          ]}
        />

        {/* Important notes */}
        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground font-mono">[i]</strong> When in doubt, look for <code className="text-primary text-xs">FLAG&#123;...&#125;</code> or <code className="text-primary text-xs">CTF&#123;...&#125;</code> in your terminal output. That&apos;s your answer.
          </p>
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground font-mono">[i]</strong> You never need to call APIs directly. The challenge cards and <code className="text-primary text-xs">ctf_helper.py</code> handle everything.
          </p>
        </div>

        {/* API reference for manual/advanced users */}
        <div className="bg-muted/50 border border-border rounded-md p-3 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">// Advanced: API Access</p>
          <p className="text-xs text-muted-foreground">
            For programmatic submission, all API calls require:
          </p>
          <code className="block bg-background border border-input rounded-md p-2 text-[11px] font-mono text-muted-foreground select-all overflow-x-auto">
            Authorization: Bearer &lt;your-session-token&gt;
          </code>
          <p className="text-xs text-muted-foreground">
            Token returned on join. Key endpoints:
          </p>
          <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
            <p><span className="text-cyan-400">POST</span> /api/submit <span className="text-muted-foreground/60">— submit a flag</span></p>
            <p className="pl-4 text-[10px]">Body: <code className="text-foreground/70">&#123; &quot;challengeId&quot;: &quot;...&quot;, &quot;flag&quot;: &quot;FLAG&#123;...&#125;&quot; &#125;</code></p>
            <p><span className="text-green-400">GET</span> /api/challenges <span className="text-muted-foreground/60">— list challenges &amp; your progress</span></p>
            <p><span className="text-green-400">GET</span> /api/starter/&#123;N&#125;?format=zip <span className="text-muted-foreground/60">— download starter code</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitTypeCard({
  label,
  title,
  color,
  bg,
  border,
  description,
  steps,
}: {
  label: string;
  title: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  steps: React.ReactNode[];
}) {
  return (
    <div className={`rounded-lg border ${border} ${bg} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${bg} border ${border} ${color}`}>
          {label}
        </span>
        <span className={`font-semibold text-sm ${color}`}>{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <ol className="space-y-1 ml-1">
        {steps.map((step, i) => (
          <li key={i} className="text-xs text-foreground flex items-start gap-2">
            <span className={`${color} font-bold shrink-0 w-4 text-right`}>{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─── Step 5: Ready ─── */
function StepReady() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3 font-mono text-primary">{"[READY]"}</div>
        <h2 className="text-2xl font-bold tracking-tight">Systems Online</h2>
        <p className="mt-2 text-muted-foreground">
          Quick reference before you drop in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickRefCard
          title="// Scoring"
          items={[
            "Higher tiers = more points (50-2,000)",
            "No penalty for wrong flags — swing big",
            "Speed bonus: 1st +30%, 2nd +20%, 3rd +10%",
            "Hints cost points (-100 to -500)",
          ]}
        />
        <QuickRefCard
          title="// Strategy"
          items={[
            "Crush the Tier 1 warm-ups first",
            "Read the README — every word matters",
            "Lean on your AI assistant hard",
            "Speed bonuses reward the bold",
          ]}
        />
        <QuickRefCard
          title="// Per Challenge"
          items={[
            "Download ZIP from challenge card",
            "pip install -r requirements.txt",
            "Read README.md, solve, submit flag",
          ]}
        />
        <QuickRefCard
          title="// Remember"
          items={[
            "Everything you need is in the ZIP",
            "Some challenges auto-submit on solve",
            "Not every challenge requires code...",
            "Tier 7 is the summit — claim it first",
          ]}
        />
      </div>

      <div className="bg-primary/10 border border-primary/30 rounded-md p-4 text-center space-y-2">
        <p className="text-sm font-medium text-primary font-mono">
          7 tiers &middot; 20 challenges &middot; 1 leaderboard
        </p>
        <p className="text-xs text-muted-foreground">
          Tier 7 isn&apos;t just the end — it&apos;s where the curious get rewarded.
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
