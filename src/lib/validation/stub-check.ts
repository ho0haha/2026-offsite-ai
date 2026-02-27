import { createHash } from "crypto";
import fs from "fs";
import path from "path";

type StubHashes = Record<string, string>;

/**
 * Load the original stub hashes for a challenge.
 * Returns null if no stub file exists (from-scratch challenges).
 */
function loadStubHashes(challengeNumber: number): StubHashes | null {
  const stubPath = path.join(process.cwd(), "data", "stubs", `ch${challengeNumber}.json`);
  try {
    return JSON.parse(fs.readFileSync(stubPath, "utf-8"));
  } catch {
    return null;
  }
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Tier 2 stub-diff validation: verify uploaded files differ from original stubs.
 * For from-scratch challenges (no stubs), checks file exists with minimum content.
 */
export function stubDiffCheck(
  challengeNumber: number,
  files: Map<string, string>,
  requiredFiles: string[]
): { valid: boolean; details: string[] } {
  const details: string[] = [];

  // Check all required files are present
  for (const req of requiredFiles) {
    if (!files.has(req)) {
      details.push(`Missing required file: ${req}`);
    }
  }
  if (details.length > 0) {
    return { valid: false, details };
  }

  const stubs = loadStubHashes(challengeNumber);

  if (stubs) {
    // Has stub hashes — verify files were modified
    let allUnchanged = true;
    for (const [filename, originalHash] of Object.entries(stubs)) {
      const content = files.get(filename);
      if (!content) continue;
      const uploadedHash = sha256(content);
      if (uploadedHash === originalHash) {
        details.push(`${filename} appears to be unmodified from the original stub`);
      } else {
        allUnchanged = false;
      }
    }
    if (allUnchanged && Object.keys(stubs).length > 0) {
      details.push("No files were modified from the original stubs. Please solve the challenge first.");
      return { valid: false, details };
    }
  } else {
    // From-scratch challenge — check minimum content
    const minLines: Record<number, number> = {
      6: 50,   // Test Factory: test file >50 lines
      8: 20,   // AI Menu Assistant: chatbot >20 lines
      12: 30,  // Full Stack Sprint: main >30 lines
    };
    const threshold = minLines[challengeNumber] || 10;

    for (const req of requiredFiles) {
      const content = files.get(req);
      if (!content) continue;
      const lineCount = content.split("\n").filter((l) => l.trim()).length;
      if (lineCount < threshold) {
        details.push(`${req} has only ${lineCount} non-empty lines (need at least ${threshold})`);
      }
    }
  }

  return { valid: details.length === 0, details };
}
