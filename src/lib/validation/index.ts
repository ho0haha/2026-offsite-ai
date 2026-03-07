import { validateCh4 } from "./ch4";
import { validateCh5 } from "./ch5";
import { validateCh7 } from "./ch7";
import { validateCh9 } from "./ch9";
import { validateCh11 } from "./ch11";
import { validateCh15 } from "./ch15";
import { validateCh16 } from "./ch16";
import { stubDiffCheck } from "./stub-check";

type ValidationResult = { valid: boolean; details: string[] };

/** Tier 1: full server-side validation */
const tier1Validators: Record<number, (files: Map<string, string>) => ValidationResult> = {
  4: validateCh4,
  5: validateCh5,
  7: validateCh7,
  9: validateCh9,
  11: validateCh11,
  15: validateCh15,
  16: validateCh16,
};

/**
 * Dispatch validation for a challenge.
 * - Tier 1 (server): runs challenge-specific content validation
 * - Tier 2 (upload): runs stub-diff check (files must differ from originals)
 */
export function validateChallenge(
  challengeNumber: number,
  validationType: string,
  files: Map<string, string>,
  requiredFiles: string[]
): ValidationResult {
  // Always check required files are present
  const missing = requiredFiles.filter((f) => !files.has(f));
  if (missing.length > 0) {
    return {
      valid: false,
      details: missing.map((f) => `Missing required file: ${f}`),
    };
  }

  if (validationType === "server") {
    const validator = tier1Validators[challengeNumber];
    if (!validator) {
      return { valid: false, details: [`No server validator for challenge ${challengeNumber}`] };
    }
    return validator(files);
  }

  if (validationType === "upload") {
    return stubDiffCheck(challengeNumber, files, requiredFiles);
  }

  return { valid: false, details: [`Unknown validation type: ${validationType}`] };
}
