import { createHmac, randomBytes } from "crypto";

const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET || "prison-captcha-secret-change-me";
const CAPTCHA_TTL_MS = 60_000; // 60 seconds

// ============================================================
// ASCII Art Digit Font (figlet-style, 6 lines tall)
// Each digit is 7 chars wide
// ============================================================
const ASCII_DIGITS: Record<string, string[]> = {
  "0": [
    "  ___  ",
    " / _ \\ ",
    "| | | |",
    "| | | |",
    "| |_| |",
    " \\___/ ",
  ],
  "1": [
    "   _   ",
    "  / |  ",
    "  | |  ",
    "  | |  ",
    "  | |  ",
    "  |_|  ",
  ],
  "2": [
    " ____  ",
    "|___ \\ ",
    "  __) |",
    " / __/ ",
    "| |___ ",
    "|_____|",
  ],
  "3": [
    " _____ ",
    "|___ / ",
    "  |_ \\ ",
    " ___) |",
    "|____/ ",
    "       ",
  ],
  "4": [
    " _  _  ",
    "| || | ",
    "| || | ",
    "|__  | ",
    "   | | ",
    "   |_| ",
  ],
  "5": [
    " ____  ",
    "| ___| ",
    "|___ \\ ",
    " ___) |",
    "|____/ ",
    "       ",
  ],
  "6": [
    "  __   ",
    " / /_  ",
    "| '_ \\ ",
    "| (_) |",
    " \\___/ ",
    "       ",
  ],
  "7": [
    " _____ ",
    "|___  |",
    "   / / ",
    "  / /  ",
    " / /   ",
    "/_/    ",
  ],
  "8": [
    "  ___  ",
    " ( _ ) ",
    " / _ \\ ",
    "| (_) |",
    " \\___/ ",
    "       ",
  ],
  "9": [
    "  ___  ",
    " / _ \\ ",
    "| (_) |",
    " \\__, |",
    "   / / ",
    "  /_/  ",
  ],
};

// Noise characters that look vaguely like ASCII art fragments
const NOISE_CHARS = ["/", "\\", "|", "_", "-", "~", ".", "*", "#", "%", "^", "+", "="];

function randomNoise(): string {
  return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
}

// ============================================================
// Type 1: ASCII Art Number Recognition
// ============================================================
function generateAsciiNumberCaptcha(): { challenge: string[]; answer: string } {
  // Generate a random 4-digit number (no leading zero)
  const num = 1000 + Math.floor(Math.random() * 9000);
  const digits = num.toString().split("");
  const answer = num.toString();

  // Build ASCII art lines
  const artLines: string[] = [];
  for (let row = 0; row < 6; row++) {
    let line = "  ";
    for (const d of digits) {
      line += ASCII_DIGITS[d][row] + " ";
    }
    artLines.push(line);
  }

  // Add noise: scatter random characters around the art
  const noisyLines: string[] = [];

  // Top noise line
  noisyLines.push(generateNoiseLine(artLines[0].length));

  for (const line of artLines) {
    // Occasionally insert noise characters at random positions
    let noisyLine = "";
    for (let i = 0; i < line.length; i++) {
      if (line[i] === " " && Math.random() < 0.06) {
        noisyLine += randomNoise();
      } else {
        noisyLine += line[i];
      }
    }
    noisyLines.push(noisyLine);
  }

  // Bottom noise line
  noisyLines.push(generateNoiseLine(artLines[0].length));

  const challenge = [
    "",
    "  ╔══════════════════════════════════════╗",
    "  ║   SECURITY CHECKPOINT                ║",
    "  ║   VISUAL VERIFICATION REQUIRED       ║",
    "  ╚══════════════════════════════════════╝",
    "",
    "  Identify the 4-digit code displayed below:",
    "",
    ...noisyLines,
    "",
    "  Type the 4 digits you see:",
  ];

  return { challenge, answer };
}

function generateNoiseLine(length: number): string {
  let line = "  ";
  for (let i = 0; i < length - 2; i++) {
    if (Math.random() < 0.15) {
      line += randomNoise();
    } else {
      line += " ";
    }
  }
  return line;
}

// ============================================================
// Type 2: Count the Symbols
// ============================================================
const COUNTING_SYMBOLS = ["★", "●", "■", "▲"];

function generateCountSymbolsCaptcha(): { challenge: string[]; answer: string } {
  const targetSymbol = COUNTING_SYMBOLS[Math.floor(Math.random() * COUNTING_SYMBOLS.length)];

  // Generate a grid with 5-8 rows and 12-16 symbols per row
  const rows = 5 + Math.floor(Math.random() * 4);
  const cols = 12 + Math.floor(Math.random() * 5);

  let targetCount = 0;
  const gridLines: string[] = [];

  for (let r = 0; r < rows; r++) {
    let line = "    ";
    for (let c = 0; c < cols; c++) {
      const sym = COUNTING_SYMBOLS[Math.floor(Math.random() * COUNTING_SYMBOLS.length)];
      if (sym === targetSymbol) targetCount++;
      line += sym + " ";
    }
    gridLines.push(line);
  }

  // Ensure count is reasonable (between 8 and 40)
  // If too low or too high, regenerate
  if (targetCount < 5 || targetCount > 50) {
    return generateCountSymbolsCaptcha();
  }

  const answer = targetCount.toString();

  const challenge = [
    "",
    "  ╔══════════════════════════════════════╗",
    "  ║   SECURITY CHECKPOINT                ║",
    "  ║   VISUAL VERIFICATION REQUIRED       ║",
    "  ╚══════════════════════════════════════╝",
    "",
    `  Count the ${targetSymbol} symbols in the grid below:`,
    "",
    ...gridLines,
    "",
    `  How many ${targetSymbol} symbols do you see?`,
  ];

  return { challenge, answer };
}

// ============================================================
// Type 3: Pattern Completion
// ============================================================
interface PatternDef {
  sequence: string[];
  answer: string;
}

function generatePatternCaptcha(): { challenge: string[]; answer: string } {
  // Generate repeating patterns of various lengths
  const symbolSets: string[][] = [
    ["▲", "■"],
    ["●", "★"],
    ["▲", "●", "■"],
    ["★", "▲", "●"],
    ["■", "★"],
    ["▲", "■", "●", "★"],
  ];

  const chosen = symbolSets[Math.floor(Math.random() * symbolSets.length)];

  // Build a sequence of 6-9 visible items, then ask for next
  const visibleCount = 6 + Math.floor(Math.random() * 4);
  const sequence: string[] = [];
  for (let i = 0; i < visibleCount; i++) {
    sequence.push(chosen[i % chosen.length]);
  }
  const answer = chosen[visibleCount % chosen.length];

  const patternDisplay = sequence.join("  ") + "  ?";

  const challenge = [
    "",
    "  ╔══════════════════════════════════════╗",
    "  ║   SECURITY CHECKPOINT                ║",
    "  ║   VISUAL VERIFICATION REQUIRED       ║",
    "  ╚══════════════════════════════════════╝",
    "",
    "  Complete the pattern — what comes next?",
    "",
    `    ${patternDisplay}`,
    "",
    "  Type the symbol that replaces the ?",
    `  Options: ${[...new Set(chosen)].join("  ")}`,
  ];

  return { challenge, answer };
}

// ============================================================
// Public API
// ============================================================

export type CaptchaType = "ascii_number" | "count_symbols" | "pattern";

export interface CaptchaChallenge {
  challenge: string[];
  answer: string;
  token: string;
  type: CaptchaType;
}

/**
 * Generate a captcha challenge.
 * Returns the visual challenge lines, the correct answer, and an HMAC-signed token.
 */
export function generateCaptcha(preferredType?: CaptchaType): CaptchaChallenge {
  const types: CaptchaType[] = ["ascii_number", "count_symbols", "pattern"];
  const type = preferredType || types[Math.floor(Math.random() * types.length)];

  let result: { challenge: string[]; answer: string };

  switch (type) {
    case "ascii_number":
      result = generateAsciiNumberCaptcha();
      break;
    case "count_symbols":
      result = generateCountSymbolsCaptcha();
      break;
    case "pattern":
      result = generatePatternCaptcha();
      break;
  }

  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  const answerHash = createHmac("sha256", CAPTCHA_SECRET)
    .update(result.answer.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);

  // Token format: CAPTCHA:<answerHash>:<nonce>:<issuedAt>:<hmac>
  const payload = `CAPTCHA:${answerHash}:${nonce}:${issuedAt}`;
  const hmac = createHmac("sha256", CAPTCHA_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);
  const token = `${payload}:${hmac}`;

  return {
    challenge: result.challenge,
    answer: result.answer,
    token,
    type,
  };
}

// Set of used captcha nonces to prevent replay
const usedCaptchaNonces = new Set<string>();
const MAX_CAPTCHA_NONCE_SET = 5_000;

/**
 * Verify a captcha answer against the signed token.
 * Returns a session proof token if valid, or null if invalid.
 */
export function verifyCaptcha(
  answer: string,
  token: string,
  participantId: string
): string | null {
  if (!token || !answer) return null;

  const parts = token.split(":");
  // Format: CAPTCHA:<answerHash>:<nonce>:<issuedAt>:<hmac>
  if (parts.length !== 5 || parts[0] !== "CAPTCHA") return null;

  const [, answerHash, nonce, issuedAtStr, providedHmac] = parts;

  // Verify HMAC
  const payload = `CAPTCHA:${answerHash}:${nonce}:${issuedAtStr}`;
  const expectedHmac = createHmac("sha256", CAPTCHA_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  if (providedHmac !== expectedHmac) return null;

  // Check expiry
  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return null;
  if (Date.now() - issuedAt > CAPTCHA_TTL_MS) return null;

  // Check replay
  if (usedCaptchaNonces.has(nonce)) return null;

  // Verify answer
  const submittedHash = createHmac("sha256", CAPTCHA_SECRET)
    .update(answer.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);

  if (submittedHash !== answerHash) return null;

  // Consume nonce
  usedCaptchaNonces.add(nonce);
  if (usedCaptchaNonces.size > MAX_CAPTCHA_NONCE_SET) {
    const entries = [...usedCaptchaNonces];
    entries.slice(0, entries.length / 2).forEach((n) => usedCaptchaNonces.delete(n));
  }

  // Generate a session proof token
  const proofNonce = randomBytes(16).toString("hex");
  const proofIssuedAt = Date.now();
  const proofPayload = `CAPTCHA_PROOF:${participantId}:${proofNonce}:${proofIssuedAt}`;
  const proofHmac = createHmac("sha256", CAPTCHA_SECRET)
    .update(proofPayload)
    .digest("hex")
    .slice(0, 32);

  return `${proofPayload}:${proofHmac}`;
}

/**
 * Verify a captcha proof token (returned by verifyCaptcha).
 * Proof tokens are valid for 60 seconds and single-use.
 */
const usedProofNonces = new Set<string>();

export function verifyCaptchaProof(
  proof: string,
  expectedParticipantId: string
): boolean {
  if (!proof) return false;

  const parts = proof.split(":");
  // Format: CAPTCHA_PROOF:<participantId>:<nonce>:<issuedAt>:<hmac>
  if (parts.length !== 5 || parts[0] !== "CAPTCHA_PROOF") return false;

  const [, participantId, nonce, issuedAtStr, providedHmac] = parts;

  if (participantId !== expectedParticipantId) return false;

  // Verify HMAC
  const payload = `CAPTCHA_PROOF:${participantId}:${nonce}:${issuedAtStr}`;
  const expectedHmac = createHmac("sha256", CAPTCHA_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  if (providedHmac !== expectedHmac) return false;

  // Check expiry
  const issuedAt = parseInt(issuedAtStr, 10);
  if (isNaN(issuedAt)) return false;
  if (Date.now() - issuedAt > CAPTCHA_TTL_MS) return false;

  // Check replay
  if (usedProofNonces.has(nonce)) return false;

  // Consume
  usedProofNonces.add(nonce);
  if (usedProofNonces.size > MAX_CAPTCHA_NONCE_SET) {
    const entries = [...usedProofNonces];
    entries.slice(0, entries.length / 2).forEach((n) => usedProofNonces.delete(n));
  }

  return true;
}
