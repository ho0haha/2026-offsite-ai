import fs from "fs";
import path from "path";

type GroundTruthEntry = { category: string; sentiment: string };

/**
 * Ch9: Smart Feedback Sorter — Tier 1 server validation
 * Parses uploaded output.csv and compares against ground truth.
 * Both category AND sentiment must match per entry.
 * Requires >= 85% accuracy (43/50).
 */
export function validateCh9(files: Map<string, string>): { valid: boolean; details: string[] } {
  const csvContent = files.get("output.csv");
  if (!csvContent) {
    return { valid: false, details: ["Missing required file: output.csv"] };
  }

  // Load ground truth from server-side file
  const gtPath = path.join(process.cwd(), "data", "ground_truth", "ch9_ground_truth.json");
  let groundTruth: Record<string, GroundTruthEntry>;
  try {
    groundTruth = JSON.parse(fs.readFileSync(gtPath, "utf-8"));
  } catch {
    return { valid: false, details: ["Server error: could not load ground truth file"] };
  }

  // Parse CSV
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    return { valid: false, details: ["output.csv is empty or has no data rows"] };
  }

  // Parse header
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const idIdx = header.indexOf("id");
  const catIdx = header.indexOf("category");
  const sentIdx = header.indexOf("sentiment");

  if (idIdx === -1 || catIdx === -1 || sentIdx === -1) {
    return {
      valid: false,
      details: [`output.csv must have columns: id, category, sentiment. Found: ${header.join(", ")}`],
    };
  }

  let correct = 0;
  let total = 0;
  const mismatches: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((v) => v.trim());
    if (row.length <= Math.max(idIdx, catIdx, sentIdx)) continue;

    const id = row[idIdx];
    const category = row[catIdx].toLowerCase();
    const sentiment = row[sentIdx].toLowerCase();

    const truth = groundTruth[id];
    if (!truth) continue;

    total++;
    if (truth.category === category && truth.sentiment === sentiment) {
      correct++;
    } else {
      if (mismatches.length < 5) {
        mismatches.push(`ID ${id}: got ${category}/${sentiment}, expected ${truth.category}/${truth.sentiment}`);
      }
    }
  }

  const accuracy = total > 0 ? correct / total : 0;
  const pct = Math.round(accuracy * 100);
  const details: string[] = [];

  if (total < 50) {
    details.push(`Only ${total} entries found in output.csv (expected 50)`);
  }

  if (accuracy < 0.85) {
    details.push(`Accuracy: ${pct}% (${correct}/${total}) — need at least 85%`);
    if (mismatches.length > 0) {
      details.push("Sample mismatches:", ...mismatches);
    }
  }

  return {
    valid: accuracy >= 0.85 && total >= 40,
    details: details.length > 0 ? details : [`Accuracy: ${pct}% (${correct}/${total})`],
  };
}
