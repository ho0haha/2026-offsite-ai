/**
 * One-time script to generate SHA-256 hashes of original challenge stub files.
 * Run: npx tsx scripts/generate-stubs.ts <path-to-challenges-repo>
 *
 * Generates data/stubs/ch{N}.json files used by Tier 2 stub-diff validation.
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const challengesRepo = process.argv[2];
if (!challengesRepo) {
  console.error("Usage: npx tsx scripts/generate-stubs.ts <path-to-challenges-repo>");
  process.exit(1);
}

const stubsDir = path.join(process.cwd(), "data", "stubs");
if (!fs.existsSync(stubsDir)) {
  fs.mkdirSync(stubsDir, { recursive: true });
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function hashFile(repoPath: string, challengeDir: string, filePath: string): string | null {
  const fullPath = path.join(repoPath, challengeDir, filePath);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return sha256(content);
  } catch {
    console.warn(`  Warning: Could not read ${fullPath}`);
    return null;
  }
}

// Tier 2 challenges with stub files that need hashing
const stubDefinitions: Record<number, { dir: string; files: string[] }> = {
  1: { dir: "01-hello-ai", files: ["starter.py"] },
  2: { dir: "02-bug-squash", files: ["buggy_script.py"] },
  3: { dir: "03-broken-order-system", files: ["app/routes.py", "app/utils.py", "app/models.py"] },
  10: {
    dir: "10-context-is-king",
    files: [
      "restaurant_system/config.py",
      "restaurant_system/customer_service.py",
      "restaurant_system/order_service.py",
      "restaurant_system/payment_service.py",
      "restaurant_system/reporting.py",
      "restaurant_system/formatters.py",
    ],
  },
};

// Challenges 6, 8, 12 are from-scratch — no stubs needed

for (const [num, def] of Object.entries(stubDefinitions)) {
  console.log(`Generating stubs for Challenge ${num}...`);
  const hashes: Record<string, string> = {};

  for (const file of def.files) {
    const hash = hashFile(challengesRepo, def.dir, file);
    if (hash) {
      hashes[file] = hash;
      console.log(`  ${file}: ${hash.slice(0, 16)}...`);
    }
  }

  const outPath = path.join(stubsDir, `ch${num}.json`);
  fs.writeFileSync(outPath, JSON.stringify(hashes, null, 2));
  console.log(`  Written to ${outPath}`);
}

console.log("\nDone! Stub hashes generated.");
