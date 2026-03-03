import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, extname } from "path";

const BINARY_EXTENSIONS = new Set([".db", ".sqlite", ".sqlite3", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".zip", ".tar", ".gz"]);

type BundleFile = {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
};

type Bundle = {
  challengeNumber: number;
  files: BundleFile[];
};

type ManifestEntry = {
  dir: string;
  include: string[];
};

function main() {
  const challengesRepoPath = process.argv[2];
  if (!challengesRepoPath) {
    console.error("Usage: tsx scripts/build-starter-bundles.ts <challenges-repo-path>");
    process.exit(1);
  }

  const resolvedRepo = join(process.cwd(), challengesRepoPath);
  if (!existsSync(resolvedRepo)) {
    console.error(`Challenges repo not found at: ${resolvedRepo}`);
    process.exit(1);
  }

  const manifestPath = join(__dirname, "starter-manifest.json");
  const manifest: Record<string, ManifestEntry> = JSON.parse(
    readFileSync(manifestPath, "utf-8")
  );

  const outDir = join(process.cwd(), "data", "starter-bundles");
  mkdirSync(outDir, { recursive: true });

  let totalFiles = 0;
  let totalSize = 0;

  for (const [num, entry] of Object.entries(manifest)) {
    const challengeDir = join(resolvedRepo, entry.dir);
    if (!existsSync(challengeDir)) {
      console.warn(`  WARN: Challenge dir not found: ${entry.dir}, skipping`);
      continue;
    }

    const files: BundleFile[] = [];

    for (const filePath of entry.include) {
      const fullPath = join(challengeDir, filePath);
      if (!existsSync(fullPath)) {
        console.warn(`  WARN: File not found: ${entry.dir}/${filePath}, skipping`);
        continue;
      }

      const ext = extname(filePath).toLowerCase();
      const isBinary = BINARY_EXTENSIONS.has(ext);

      if (isBinary) {
        const buf = readFileSync(fullPath);
        files.push({
          path: filePath,
          content: buf.toString("base64"),
          encoding: "base64",
        });
      } else {
        files.push({
          path: filePath,
          content: readFileSync(fullPath, "utf-8"),
          encoding: "utf-8",
        });
      }
    }

    const bundle: Bundle = {
      challengeNumber: Number(num),
      files,
    };

    const outPath = join(outDir, `ch${num}.json`);
    const json = JSON.stringify(bundle);
    writeFileSync(outPath, json);

    totalFiles += files.length;
    totalSize += json.length;

    console.log(
      `  ch${num} (${entry.dir}): ${files.length} files, ${(json.length / 1024).toFixed(1)} KB`
    );
  }

  console.log(
    `\nDone! ${Object.keys(manifest).length} bundles, ${totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB total`
  );
}

main();
