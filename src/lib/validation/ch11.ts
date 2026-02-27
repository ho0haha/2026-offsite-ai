/**
 * Ch11: Prompt Craftsman — Tier 1 server validation
 * Validates 5 output files against content requirements.
 */
export function validateCh11(files: Map<string, string>): { valid: boolean; details: string[] } {
  const details: string[] = [];

  const validators: Record<string, (content: string) => string[]> = {
    "outputs/output1.md": validateOutput1,
    "outputs/output2.md": validateOutput2,
    "outputs/output3.md": validateOutput3,
    "outputs/output4.md": validateOutput4,
    "outputs/output5.md": validateOutput5,
  };

  for (const [filename, validator] of Object.entries(validators)) {
    const content = files.get(filename);
    if (!content) {
      details.push(`Missing required file: ${filename}`);
      continue;
    }
    const errors = validator(content);
    if (errors.length > 0) {
      details.push(`${filename}: ${errors.join("; ")}`);
    }
  }

  return { valid: details.length === 0, details };
}

/** Output1: Comprehensive docstring — Args/Parameters, Returns, code blocks, Raises, param names */
function validateOutput1(content: string): string[] {
  const errors: string[] = [];
  const lower = content.toLowerCase();

  if (!/args|parameters|params/i.test(content)) {
    errors.push("Missing Args/Parameters section");
  }
  if (!/returns?:/i.test(content)) {
    errors.push("Missing Returns section");
  }
  // At least 2 code blocks
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  if (codeBlocks < 2) {
    errors.push(`Found ${Math.floor(codeBlocks)} code blocks, need at least 2`);
  }
  if (!/raises?|exceptions?/i.test(content)) {
    errors.push("Missing Raises/Exceptions section");
  }
  // Check for at least 6 parameter name mentions
  const paramPattern = /`\w+`/g;
  const params = content.match(paramPattern) || [];
  if (params.length < 6) {
    errors.push(`Found ${params.length} parameter references, need at least 6`);
  }

  return errors;
}

/** Output2: Bug pattern — function names, None/null, fix/solution */
function validateOutput2(content: string): string[] {
  const errors: string[] = [];

  // At least 3 function name references
  const funcPattern = /`\w+`/g;
  const funcs = content.match(funcPattern) || [];
  if (funcs.length < 3) {
    errors.push(`Found ${funcs.length} code references, need at least 3`);
  }
  if (!/none|null/i.test(content)) {
    errors.push("Missing mention of None/null");
  }
  if (!/fix|solution|corrected|resolved/i.test(content)) {
    errors.push("Missing fix/solution description");
  }

  return errors;
}

/** Output3: Optimization — code blocks, O(n) notation, before/after */
function validateOutput3(content: string): string[] {
  const errors: string[] = [];

  const codeBlocks = (content.match(/```/g) || []).length / 2;
  if (codeBlocks < 2) {
    errors.push(`Found ${Math.floor(codeBlocks)} code blocks, need at least 2`);
  }
  if (!/O\([^)]+\)/i.test(content)) {
    errors.push("Missing Big-O notation (e.g., O(n), O(n^2))");
  }
  if (!/before|after|original|optimized/i.test(content)) {
    errors.push("Missing before/after comparison");
  }

  return errors;
}

/** Output4: Complexity explanation — Big-O, analogy, "log", 100+ words */
function validateOutput4(content: string): string[] {
  const errors: string[] = [];

  if (!/O\([^)]+\)/i.test(content)) {
    errors.push("Missing Big-O notation");
  }
  if (!/like|imagine|think of|similar to|analogy|picture|compare/i.test(content)) {
    errors.push("Missing analogy or real-world comparison");
  }
  if (!/log/i.test(content)) {
    errors.push("Missing mention of 'log' (logarithmic)");
  }
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 100) {
    errors.push(`Only ${wordCount} words, need at least 100`);
  }

  return errors;
}

/** Output5: Migration plan — "step", rollback/revert, backward compatible, data migration, 200+ words */
function validateOutput5(content: string): string[] {
  const errors: string[] = [];

  if (!/step/i.test(content)) {
    errors.push("Missing 'step' in migration plan");
  }
  if (!/rollback|revert/i.test(content)) {
    errors.push("Missing rollback/revert strategy");
  }
  if (!/backward.?compat|backwards?.?compat/i.test(content)) {
    errors.push("Missing backward compatibility mention");
  }
  if (!/data\s*migrat/i.test(content)) {
    errors.push("Missing data migration description");
  }
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 200) {
    errors.push(`Only ${wordCount} words, need at least 200`);
  }

  return errors;
}
