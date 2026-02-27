/**
 * Ch5: Spaghetti Untangler — Tier 1 server validation (structural only)
 * Checks refactored order_processor.py for:
 * - At least 6 function definitions
 * - No function body exceeds 30 lines
 * - At least 5 UPPER_CASE module-level constants
 */
export function validateCh5(files: Map<string, string>): { valid: boolean; details: string[] } {
  const content = files.get("order_processor.py");
  if (!content) {
    return { valid: false, details: ["Missing required file: order_processor.py"] };
  }

  const lines = content.split("\n");
  const details: string[] = [];

  // Count function definitions
  const funcPattern = /^def\s+\w+/;
  const funcLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (funcPattern.test(lines[i].trim())) {
      funcLines.push(i);
    }
  }

  if (funcLines.length < 6) {
    details.push(`Found ${funcLines.length} functions, need at least 6`);
  }

  // Check no function exceeds 30 lines
  for (let i = 0; i < funcLines.length; i++) {
    const start = funcLines[i];
    const end = i + 1 < funcLines.length ? funcLines[i + 1] : lines.length;
    // Count non-empty, non-comment lines in the function body
    let bodyLines = 0;
    for (let j = start + 1; j < end; j++) {
      const trimmed = lines[j].trim();
      if (trimmed && !trimmed.startsWith("#")) {
        bodyLines++;
      }
    }
    if (bodyLines > 30) {
      const funcName = lines[start].trim().match(/^def\s+(\w+)/)?.[1] || "unknown";
      details.push(`Function '${funcName}' has ${bodyLines} lines (max 30)`);
    }
  }

  // Count UPPER_CASE module-level constants
  const constantPattern = /^[A-Z][A-Z_0-9]+\s*=/;
  let constantCount = 0;
  for (const line of lines) {
    if (constantPattern.test(line.trim()) && !line.startsWith(" ") && !line.startsWith("\t")) {
      constantCount++;
    }
  }

  if (constantCount < 5) {
    details.push(`Found ${constantCount} module-level constants, need at least 5`);
  }

  return { valid: details.length === 0, details };
}
