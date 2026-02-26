import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "ctf.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    starts_at TEXT,
    ends_at TEXT,
    is_active INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_id TEXT REFERENCES events(id),
    joined_at TEXT DEFAULT (datetime('now')),
    total_points INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES events(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    points INTEGER NOT NULL,
    flag TEXT NOT NULL,
    tool TEXT NOT NULL,
    hints TEXT,
    sort_order INTEGER DEFAULT 0,
    starter_url TEXT
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    participant_id TEXT REFERENCES participants(id),
    challenge_id TEXT REFERENCES challenges(id),
    submitted_flag TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    submitted_at TEXT DEFAULT (datetime('now'))
  );
`);

// Clear existing data (order matters for FK constraints)
sqlite.exec(`DELETE FROM submissions`);
sqlite.exec(`DELETE FROM challenges`);
sqlite.exec(`DELETE FROM participants`);
sqlite.exec(`DELETE FROM events`);

// Create default event
const eventId = nanoid();
const joinCode = "YUMCTF";

sqlite
  .prepare(
    `INSERT INTO events (id, name, join_code, is_active) VALUES (?, ?, ?, 1)`
  )
  .run(eventId, "Yum! Brands AI Coding CTF", joinCode);

console.log(`Created event with join code: ${joinCode}`);

const CHALLENGES_REPO = "https://github.com/ho0haha/2026-offsite-ai-challenges";

// Challenge definitions
const challenges = [
  {
    title: "Hello AI",
    description:
      "Given docstring specs for 3 Python functions, use Cursor to generate implementations that pass the provided pytest suite.\n\nYour task:\n1. Open starter.py — you'll see 3 functions with detailed docstrings but empty bodies\n2. Use Cursor's inline generation (Tab or Cmd+K) to implement each function\n3. Run the pytest suite: python -m pytest test_solution.py\n4. When all 9 tests pass, the test harness prints the flag",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{hello_ai_w3lc0me_2_th3_ctf}",
    tool: "Cursor",
    hints: [
      "Start by reading the docstrings carefully — they specify exact behavior",
      "Use Cmd+K in Cursor to generate each function body from the docstring",
    ],
    sortOrder: 1,
    starterUrl: `${CHALLENGES_REPO}/tree/main/01-hello-ai`,
  },
  {
    title: "Bug Squash",
    description:
      "A Python script has 3 planted bugs: an off-by-one error, a wrong operator, and a missing return statement.\n\nYour task:\n1. Open buggy_script.py in Claude Code\n2. Ask Claude Code to identify and fix all bugs\n3. Apply the fixes\n4. Run: bash run.sh\n5. Correct output IS the flag",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{bug_squash_d3bugg1ng_pr0}",
    tool: "Claude Code",
    hints: [
      "There are exactly 3 bugs — off-by-one, wrong operator, missing return",
      "Try: 'Find all bugs in this file and explain each one'",
    ],
    sortOrder: 2,
    starterUrl: `${CHALLENGES_REPO}/tree/main/02-bug-squash`,
  },
  {
    title: "The Broken Order System",
    description:
      "A FastAPI ordering API has 5 subtle bugs across 4 files (~300 lines total): an off-by-one error, wrong status code, missing validation, incorrect calculation, and an edge case failure.\n\nYour task:\n1. Open the app/ directory in Cursor\n2. Run the test suite: python -m pytest tests/test_orders.py — 5 of 20 tests fail\n3. Use Cursor's multi-file Composer to identify and fix all 5 bugs\n4. When all 20 tests pass, the test harness prints the flag",
    category: "debugging",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{broken_orders_5_bugs_fixed}",
    tool: "Cursor",
    hints: [
      "Run the tests first to see which 5 are failing — focus on those",
      "Use Cursor Composer to reference all 4 files at once for cross-file debugging",
      "The 5 bugs are: off-by-one in pagination, wrong HTTP status on create, missing quantity validation, tax calculation error, empty cart edge case",
    ],
    sortOrder: 3,
    starterUrl: `${CHALLENGES_REPO}/tree/main/03-broken-order-system`,
  },
  {
    title: "Production Incident",
    description:
      "You're on-call! A Python app has error logs (500 lines), source code, and a failing health check.\n\nYour task:\n1. Feed the error logs and source code to Claude Code\n2. Use AI to correlate log patterns with code to identify the root cause\n3. Fix the root cause in the application code\n4. Run: bash recover.sh\n5. The recovery script validates the fix and prints the flag",
    category: "debugging",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{production_incident_r00t_caus3}",
    tool: "Claude Code",
    hints: [
      "Start by asking Claude Code to analyze the error patterns in the logs",
      "Look for a database connection pool exhaustion pattern",
      "The fix involves proper connection cleanup in the request handler",
    ],
    sortOrder: 4,
    starterUrl: `${CHALLENGES_REPO}/tree/main/04-production-incident`,
  },
  {
    title: "Spaghetti Untangler",
    description:
      "A single 400-line Python function processes restaurant orders with deeply nested ifs, magic numbers, and duplicated logic.\n\nYour task:\n1. Open order_processor.py in Cursor\n2. Refactor into clean, modular code\n3. Requirements: all original tests still pass, no function exceeds 30 lines, at least 6 functions\n4. Run: python -m pytest test_processor.py\n5. When all behavior tests AND structural checks pass, the flag is printed",
    category: "refactoring",
    difficulty: "hard",
    points: 250,
    flag: "FLAG{spaghetti_untangled_cl34n_c0de}",
    tool: "Cursor",
    hints: [
      "Start by identifying the distinct responsibilities in the mega-function",
      "Extract magic numbers into named constants first",
      "Use Cursor's select-and-refactor to extract functions one at a time",
    ],
    sortOrder: 5,
    starterUrl: `${CHALLENGES_REPO}/tree/main/05-spaghetti-untangler`,
  },
  {
    title: "Test Factory",
    description:
      "A 200-line Python module (restaurant inventory manager) has 0% test coverage.\n\nYour task:\n1. Read inventory.py to understand the module\n2. Use Claude Code to write comprehensive pytest tests\n3. Run: bash run_coverage.sh\n4. When coverage reaches 90%+, the script prints the flag\n5. Iterate: run coverage, find gaps, write more tests",
    category: "refactoring",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{test_factory_90_percent_c0v3rag3}",
    tool: "Claude Code",
    hints: [
      "Ask Claude Code to analyze the module and identify all branches to cover",
      "Don't forget edge cases: empty inventory, negative quantities, duplicate items",
      "Use the iterative loop: write tests → run coverage → see gaps → write more",
    ],
    sortOrder: 6,
    starterUrl: `${CHALLENGES_REPO}/tree/main/06-test-factory`,
  },
  {
    title: "Spec Builder + Build",
    description:
      'Two-phase challenge: write a PRD then build from it.\n\nBrief: "Yum wants a way for store managers to track daily food waste and see trends. It should be simple and help reduce waste by 10%."\n\nPhase 1 — PRD:\n1. Use Claude Code conversationally to flesh out the brief into a complete PRD\n2. PRD must include: 3+ user stories ("As a... I want... So that..."), 5+ acceptance criteria, edge cases/error handling section, technical approach section\n3. Save as prd.md and validate: python prd_validator.py prd.md\n\nPhase 2 — Build:\n4. Use Claude Code to build a working Python implementation from your PRD\n5. Run: bash validate.sh\n6. Flag printed when both PRD and implementation pass validation',
    category: "spec-to-feature",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{spec_builder_prd_2_pr0duct}",
    tool: "Claude Code",
    hints: [
      "Start by asking Claude Code to interview you about the brief — let it ask probing questions",
      "For Phase 1, explicitly ask for user stories in the 'As a / I want / So that' format",
      "For Phase 2, paste your PRD back into Claude Code and ask it to build the implementation",
    ],
    sortOrder: 7,
    starterUrl: `${CHALLENGES_REPO}/tree/main/07-spec-builder`,
  },
  {
    title: "AI Menu Assistant",
    description:
      "Build a Python CLI chatbot that uses the Claude API to answer customer questions about a restaurant menu.\n\nYour task:\n1. menu.json contains the full menu (items, prices, ingredients, allergens)\n2. Build a script that takes a question and returns an accurate answer using the Claude API\n3. A shared API key is provided via the ANTHROPIC_API_KEY env var\n4. Run: python test_chatbot.py\n5. The test harness sends 10 questions — flag printed when 8/10 pass",
    category: "building-with-llms",
    difficulty: "medium",
    points: 300,
    flag: "FLAG{ai_menu_assistant_8_of_10}",
    tool: "Cursor",
    hints: [
      "Include the full menu JSON in your system prompt for context",
      "Be explicit in your prompt that the AI should only answer based on the provided menu data",
      "Test with questions about prices, allergens, and ingredients",
    ],
    sortOrder: 8,
    starterUrl: `${CHALLENGES_REPO}/tree/main/08-ai-menu-assistant`,
  },
  {
    title: "Smart Feedback Sorter",
    description:
      "Build a Python script that uses the Claude API to categorize 50 customer feedback entries.\n\nYour task:\n1. feedback.csv has 50 entries to categorize into: service, food quality, wait time, cleanliness, other\n2. Each entry also needs sentiment: positive or negative\n3. Use the ANTHROPIC_API_KEY env var for Claude API access\n4. Output results to output.csv\n5. Run: python validate.py — flag at 85%+ accuracy against ground truth",
    category: "building-with-llms",
    difficulty: "medium",
    points: 250,
    flag: "FLAG{smart_sorter_85_percent_acc}",
    tool: "Claude Code",
    hints: [
      "Batch the feedback entries to minimize API calls — send 10 at a time",
      "Include clear category definitions in your prompt with examples",
      "If accuracy is below 85%, tweak your prompt and re-run",
    ],
    sortOrder: 9,
    starterUrl: `${CHALLENGES_REPO}/tree/main/09-smart-feedback-sorter`,
  },
  {
    title: "Context is King",
    description:
      "A 12-file restaurant management system (~1500 lines) needs a new \"loyalty points\" feature that touches 6 files.\n\nYour task:\n1. Read FEATURE_SPEC.md for the loyalty points requirements\n2. The feature touches: models, routes, utils, templates, config, and tests\n3. Use Cursor's Composer with @-mentions to manage the large context\n4. Run: python -m pytest test_loyalty.py\n5. Flag printed when the integration test suite passes",
    category: "advanced-mastery",
    difficulty: "hard",
    points: 350,
    flag: "FLAG{context_is_king_l0yalty_p0ints}",
    tool: "Cursor",
    hints: [
      "Start by reading FEATURE_SPEC.md and identifying which 6 files need changes",
      "Use @-file references in Cursor Composer to include all relevant files",
      "Consider creating a CLAUDE.md file to help Cursor understand the project structure",
    ],
    sortOrder: 10,
    starterUrl: `${CHALLENGES_REPO}/tree/main/10-context-is-king`,
  },
  {
    title: "Prompt Craftsman",
    description:
      "5 prompt engineering mini-challenges. Each gives you a Python function and a task.\n\nChallenges:\n1. Generate comprehensive docstrings for a complex function\n2. Identify a subtle bug pattern across 3 similar functions\n3. Suggest a performance optimization with before/after code\n4. Explain time complexity in plain English\n5. Write a database migration plan from the code diff\n\nYour prompts must produce output matching specific criteria. Run: python validate_all.py to check all 5 and get the flag.",
    category: "advanced-mastery",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{prompt_craftsman_5_for_5}",
    tool: "Cursor",
    hints: [
      "Read the validation criteria BEFORE crafting your prompts",
      "Be very specific in your prompts — vague instructions get vague results",
      "Use Cursor's Cmd+K for rapid iteration on each prompt",
    ],
    sortOrder: 11,
    starterUrl: `${CHALLENGES_REPO}/tree/main/11-prompt-craftsman`,
  },
  {
    title: "Full Stack Sprint",
    description:
      "Build a complete restaurant store locator from scratch: FastAPI backend + HTML/JS frontend + SQLite database.\n\nYour task:\n1. data/stores.csv has 500 store locations (lat/lng, city, brand, features)\n2. Build: search by city, distance-based nearest stores, filter by brand\n3. No starter code — build everything from scratch using Claude Code\n4. Run: python test_e2e.py\n5. End-to-end test suite validates all features — flag on pass",
    category: "bonus",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{full_stack_sprint_st0re_l0cat0r}",
    tool: "Claude Code",
    hints: [
      "Let Claude Code scaffold the entire project structure first",
      "Start with the data model and import script, then build the API, then the frontend",
      "The Haversine formula is needed for distance calculations",
    ],
    sortOrder: 12,
    starterUrl: `${CHALLENGES_REPO}/tree/main/12-full-stack-sprint`,
  },
];

// Insert challenges
const insertChallenge = sqlite.prepare(`
  INSERT OR REPLACE INTO challenges (id, event_id, title, description, category, difficulty, points, flag, tool, hints, sort_order, starter_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertAll = sqlite.transaction(() => {
  for (const ch of challenges) {
    insertChallenge.run(
      nanoid(),
      eventId,
      ch.title,
      ch.description,
      ch.category,
      ch.difficulty,
      ch.points,
      ch.flag,
      ch.tool,
      JSON.stringify(ch.hints),
      ch.sortOrder,
      ch.starterUrl || null
    );
  }
});

insertAll();

console.log(`Seeded ${challenges.length} challenges`);
console.log(`\nEvent: Yum! Brands AI Coding CTF`);
console.log(`Join Code: ${joinCode}`);
console.log(`Status: Active`);
console.log(`\nRun 'npm run dev' to start the server`);

sqlite.close();
