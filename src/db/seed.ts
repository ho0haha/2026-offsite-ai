import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";

// Starter code is now served through the tier-gated /api/starter/{N} endpoint.
// No external URLs needed — bundles are embedded in the server deployment.

const challenges = [
  {
    title: "Hello AI",
    description:
      "Given docstring specs for 3 Python functions, use your AI coding assistant to generate implementations that pass the provided pytest suite.\n\nYour task:\n1. Open starter.py — you'll see 3 functions with detailed docstrings but empty bodies\n2. Use your AI tool's code generation to implement each function\n3. Run the pytest suite: python -m pytest test_solution.py\n4. When all 9 tests pass, the test harness prints the flag",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{hello_ai_w3lc0me_2_th3_ctf}",
    hints: [
      "Start by reading the docstrings carefully — they specify exact behavior",
      "Use your AI tool to generate each function body from the docstring",
    ],
    sortOrder: 1,
    tier: 1,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["starter.py"],
  },
  {
    title: "Bug Squash",
    description:
      "A Python script has 3 planted bugs: an off-by-one error, a wrong operator, and a missing return statement.\n\nYour task:\n1. Open buggy_script.py in your AI coding assistant\n2. Ask your AI coding assistant to identify and fix all bugs\n3. Apply the fixes\n4. Run: bash run.sh\n5. Correct output IS the flag",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{bug_squash_d3bugg1ng_pr0}",
    hints: [
      "There are exactly 3 bugs — off-by-one, wrong operator, missing return",
      "Try: 'Find all bugs in this file and explain each one'",
    ],
    sortOrder: 2,
    tier: 1,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["buggy_script.py"],
  },
  {
    title: "The Broken Order System",
    description:
      "A FastAPI ordering API has 5 subtle bugs across 4 files (~300 lines total): an off-by-one error, wrong status code, missing validation, incorrect calculation, and an edge case failure.\n\nYour task:\n1. Open the app/ directory in your AI coding assistant\n2. Run the test suite: python -m pytest tests/test_orders.py — 5 of 20 tests fail\n3. Use your AI tool's multi-file capabilities to identify and fix all 5 bugs\n4. When all 20 tests pass, the test harness prints the flag",
    category: "debugging",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{broken_orders_5_bugs_fixed}",
    hints: [
      "Run the tests first to see which 5 are failing — focus on those",
      "Use your AI tool to reference all 4 files at once for cross-file debugging",
      "The 5 bugs are: off-by-one in pagination, wrong HTTP status on create, missing quantity validation, tax calculation error, empty cart edge case",
    ],
    sortOrder: 3,
    tier: 2,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["app/routes.py", "app/utils.py", "app/models.py"],
  },
  {
    title: "Production Incident",
    description:
      "You're on-call! A Python app has error logs (500 lines), source code, and a failing health check.\n\nYour task:\n1. Feed the error logs and source code to your AI coding assistant\n2. Use AI to correlate log patterns with code to identify the root cause\n3. Fix the root cause in the application code\n4. Run: bash recover.sh\n5. The recovery script validates the fix and prints the flag",
    category: "debugging",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{production_incident_r00t_caus3}",
    hints: [
      "Start by asking your AI coding assistant to analyze the error patterns in the logs",
      "Look for a database connection pool exhaustion pattern",
      "The fix involves proper connection cleanup in the request handler",
    ],
    sortOrder: 4,
    tier: 2,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["app/server.py"],
  },
  {
    title: "Spaghetti Untangler",
    description:
      "A single 400-line Python function processes restaurant orders with deeply nested ifs, magic numbers, and duplicated logic.\n\nYour task:\n1. Open order_processor.py in your AI coding assistant\n2. Refactor into clean, modular code\n3. Requirements: all original tests still pass, no function exceeds 30 lines, at least 6 functions\n4. Run: python -m pytest test_processor.py\n5. When all behavior tests AND structural checks pass, the flag is printed",
    category: "refactoring",
    difficulty: "hard",
    points: 250,
    flag: "FLAG{spaghetti_untangled_cl34n_c0de}",
    hints: [
      "Start by identifying the distinct responsibilities in the mega-function",
      "Extract magic numbers into named constants first",
      "Use your AI tool's refactoring capabilities to extract functions one at a time",
    ],
    sortOrder: 5,
    tier: 2,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["order_processor.py"],
  },
  {
    title: "Test Factory",
    description:
      "A 200-line Python module (restaurant inventory manager) has 0% test coverage.\n\nYour task:\n1. Read inventory.py to understand the module\n2. Use your AI coding assistant to write comprehensive pytest tests\n3. Run: bash run_coverage.sh\n4. When coverage reaches 90%+, the script prints the flag\n5. Iterate: run coverage, find gaps, write more tests",
    category: "refactoring",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{test_factory_90_percent_c0v3rag3}",
    hints: [
      "Ask your AI coding assistant to analyze the module and identify all branches to cover",
      "Don't forget edge cases: empty inventory, negative quantities, duplicate items",
      "Use the iterative loop: write tests → run coverage → see gaps → write more",
    ],
    sortOrder: 6,
    tier: 2,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["test_inventory.py"],
  },
  {
    title: "Prompt Craftsman",
    description:
      "5 prompt engineering mini-challenges. Each gives you a Python function and a task.\n\nChallenges:\n1. Generate comprehensive docstrings for a complex function\n2. Identify a subtle bug pattern across 3 similar functions\n3. Suggest a performance optimization with before/after code\n4. Explain time complexity in plain English\n5. Write a database migration plan from the code diff\n\nYour prompts must produce output matching specific criteria. Run: python validate_all.py to check all 5 and get the flag.",
    category: "advanced-mastery",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{prompt_craftsman_5_for_5}",
    hints: [
      "Read the validation criteria BEFORE crafting your prompts",
      "Be very specific in your prompts — vague instructions get vague results",
      "Use your AI tool for rapid iteration on each prompt",
    ],
    sortOrder: 7,
    tier: 2,
    starterUrl: null,
    validationType: "server",
    requiredFiles: [
      "outputs/output1.md",
      "outputs/output2.md",
      "outputs/output3.md",
      "outputs/output4.md",
      "outputs/output5.md",
    ],
  },
  {
    title: "Smart Feedback Sorter",
    description:
      "Build a Python script that uses the Claude API to categorize 50 customer feedback entries.\n\nYour task:\n1. feedback.csv has 50 entries to categorize into: service, food quality, wait time, cleanliness, other\n2. Each entry also needs sentiment: positive or negative\n3. Use the ANTHROPIC_API_KEY env var for Claude API access\n4. Output results to output.csv\n5. Run: python validate.py — flag at 85%+ accuracy against ground truth",
    category: "building-with-llms",
    difficulty: "medium",
    points: 250,
    flag: "FLAG{smart_sorter_85_percent_acc}",
    hints: [
      "Batch the feedback entries to minimize API calls — send 10 at a time",
      "Include clear category definitions in your prompt with examples",
      "If accuracy is below 85%, tweak your prompt and re-run",
    ],
    sortOrder: 8,
    tier: 2,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["output.csv"],
  },
  {
    title: "Spec Builder + Build",
    description:
      'Two-phase challenge: write a PRD then build from it.\n\nBrief: "Yum wants a way for store managers to track daily food waste and see trends. It should be simple and help reduce waste by 10%."\n\nPhase 1 — PRD:\n1. Use your AI coding assistant conversationally to flesh out the brief into a complete PRD\n2. PRD must include: 3+ user stories ("As a... I want... So that..."), 5+ acceptance criteria, edge cases/error handling section, technical approach section\n3. Save as prd.md and validate: python prd_validator.py prd.md\n\nPhase 2 — Build:\n4. Use your AI coding assistant to build a working Python implementation from your PRD\n5. Run: bash validate.sh\n6. Flag printed when both PRD and implementation pass validation',
    category: "spec-to-feature",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{spec_builder_prd_2_pr0duct}",
    hints: [
      "Start by asking your AI coding assistant to interview you about the brief — let it ask probing questions",
      "For Phase 1, explicitly ask for user stories in the 'As a / I want / So that' format",
      "For Phase 2, paste your PRD back into your AI coding assistant and ask it to build the implementation",
    ],
    sortOrder: 9,
    tier: 3,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["prd.md"],
  },
  {
    title: "AI Menu Assistant",
    description:
      "Build a Python CLI chatbot that uses the Claude API to answer customer questions about a restaurant menu.\n\nYour task:\n1. menu.json contains the full menu (items, prices, ingredients, allergens)\n2. Build a script that takes a question and returns an accurate answer using the Claude API\n3. A shared API key is provided via the ANTHROPIC_API_KEY env var\n4. Run: python test_chatbot.py\n5. The test harness sends 10 questions — flag printed when 8/10 pass",
    category: "building-with-llms",
    difficulty: "medium",
    points: 300,
    flag: "FLAG{ai_menu_assistant_8_of_10}",
    hints: [
      "Include the full menu JSON in your system prompt for context",
      "Be explicit in your prompt that the AI should only answer based on the provided menu data",
      "Test with questions about prices, allergens, and ingredients",
    ],
    sortOrder: 10,
    tier: 3,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["chatbot.py"],
  },
  {
    title: "Context is King",
    description:
      "A 12-file restaurant management system (~1500 lines) needs a new \"loyalty points\" feature that touches 6 files.\n\nYour task:\n1. Read FEATURE_SPEC.md for the loyalty points requirements\n2. The feature touches: models, routes, utils, templates, config, and tests\n3. Use your AI tool's multi-file context features to manage the large context\n4. Run: python -m pytest test_loyalty.py\n5. Flag printed when the integration test suite passes",
    category: "advanced-mastery",
    difficulty: "hard",
    points: 350,
    flag: "FLAG{context_is_king_l0yalty_p0ints}",
    hints: [
      "Start by reading FEATURE_SPEC.md and identifying which 6 files need changes",
      "Use your AI tool's file reference features to include all relevant files",
      "Consider creating a project context file to help your AI tool understand the project structure",
    ],
    sortOrder: 11,
    tier: 3,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: [
      "restaurant_system/config.py",
      "restaurant_system/customer_service.py",
      "restaurant_system/order_service.py",
      "restaurant_system/payment_service.py",
      "restaurant_system/reporting.py",
      "restaurant_system/formatters.py",
    ],
  },
  {
    title: "Full Stack Sprint",
    description:
      "Build a complete restaurant store locator from scratch: FastAPI backend + HTML/JS frontend + SQLite database.\n\nYour task:\n1. data/stores.csv has 500 store locations (lat/lng, city, brand, features)\n2. Build: search by city, distance-based nearest stores, filter by brand\n3. No starter code — build everything from scratch using your AI coding assistant\n4. Run: python test_e2e.py\n5. End-to-end test suite validates all features — flag on pass",
    category: "bonus",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{full_stack_sprint_st0re_l0cat0r}",
    hints: [
      "Let your AI coding assistant scaffold the entire project structure first",
      "Start with the data model and import script, then build the API, then the frontend",
      "The Haversine formula is needed for distance calculations",
    ],
    sortOrder: 12,
    tier: 3,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["app/main.py"],
  },
  {
    title: "The Onion Bug",
    description:
      "A restaurant order processing system has 7 layered bugs across 5 files. Each fix changes the execution flow, revealing the next bug hidden underneath.\n\nYour task:\n1. Open the order_system/ directory — 5 modules: processor.py, pricing.py, validators.py, models.py, inventory.py\n2. Run: python run_tests.py — the test runner executes 7 test groups sequentially\n3. Each test group only runs if the previous group passes — fix layer by layer\n4. Bugs in later layers only manifest after earlier layers are fixed\n5. When all 7 layers pass, the test runner prints the flag",
    category: "cascading-debug",
    difficulty: "hard",
    points: 600,
    flag: "CTF{onion_layers_peeled_7_deep}",
    hints: [
      "Fix one layer at a time — don't try to fix everything at once based on the initial state",
      "After fixing each layer, re-run to see what new failures appear",
      "Later bugs are invisible until earlier bugs are fixed — the execution flow changes",
    ],
    sortOrder: 13,
    tier: 4,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: [
      "order_system/processor.py",
      "order_system/pricing.py",
      "order_system/validators.py",
      "order_system/models.py",
      "order_system/inventory.py",
    ],
  },
  {
    title: "The Fuzz Gauntlet",
    description:
      "Implement 4 Python functions that must survive property-based testing with 10,000+ random inputs each. Hypothesis will throw every edge case imaginable at your code.\n\nYour task:\n1. Read the detailed docstrings in functions.py — they define the exact behavior and invariants\n2. Implement all 4 functions: calculate_bill, schedule_reservation, parse_order, reconcile_inventory\n3. Run: python run_fuzz.py (or: python -m pytest test_fuzz.py)\n4. The property tests check invariants, not examples — your code must be correct for ALL inputs\n5. Flag printed when all property tests pass",
    category: "robustness",
    difficulty: "hard",
    points: 600,
    flag: "CTF{fuzz_tested_and_bulletproof}",
    hints: [
      "Read test_fuzz.py to understand exactly which properties are being tested",
      "Edge cases that trip up AI: floating-point rounding, timezone DST gaps, coupon interaction order",
      "Think about: NaN, Inf, empty inputs, negative numbers, unicode, extremely long strings",
    ],
    sortOrder: 14,
    tier: 4,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["functions.py"],
  },
  {
    title: "The Undocumented API",
    description:
      "A REST API server is running locally with no documentation. Only one endpoint is known: GET /health. Discover the rest through exploration.\n\nYour task:\n1. Start the server: uvicorn server:app\n2. Open explorer.py — it has the base URL and a starting hint\n3. Explore the API: discover endpoints, figure out the custom auth scheme, navigate a 10-step workflow\n4. Every error response includes a 'hint' field to guide you\n5. Write a solution.py script that completes the full workflow and retrieves the flag",
    category: "exploration",
    difficulty: "hard",
    points: 500,
    flag: "CTF{api_explorer_master_chef}",
    hints: [
      "Start with GET /health — the response tells you where to go next",
      "The API uses a custom HMAC-based auth scheme — /api/auth/discover explains how it works",
      "Read the 'hint' field in every response carefully, including error responses",
    ],
    sortOrder: 15,
    tier: 4,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["solution.py"],
  },
  {
    title: "The Agent Maze",
    description:
      "Build a Python AI agent that autonomously navigates a randomized puzzle maze. The maze regenerates on every new session — you can't hardcode the solution.\n\nYour task:\n1. Start the maze server: python maze_server.py\n2. Study agent_template.py — it has the API client boilerplate and session management\n3. Build an agent that solves 10 different puzzle types (math, cipher, logic, pattern, graph, and more)\n4. Collect all 10 tokens across ~20 rooms. Watch out for trap rooms and dead ends.\n5. Sessions expire after 10 minutes or 100 API calls. Submit tokens to get the flag.\n\nYour agent can use the Claude API (ANTHROPIC_API_KEY is available) for reasoning about puzzles.",
    category: "agent-building",
    difficulty: "hard",
    points: 1000,
    flag: "CTF{maze_agent_autonomous_navigator}",
    hints: [
      "Build a loop: start session → solve puzzle → collect token → move to next room → repeat",
      "Keep a memory of visited rooms, collected tokens, and variables from previous puzzles",
      "Trap rooms return plausible-looking but wrong data — your agent must detect inconsistencies",
    ],
    sortOrder: 16,
    tier: 5,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["agent.py"],
  },
  {
    title: "The Gauntlet Sprint",
    description:
      "10 independent mini-challenges spanning async bugs, SQL optimization, regex, custom sorting, rate limiting, log parsing, memory leaks, LRU caches, schema migrations, and stream processing. Complete 8 out of 10 to get the flag.\n\nYour task:\n1. Explore the gauntlet/ directory — each subfolder (01_async through 10_stream) is a self-contained challenge\n2. Read each challenge's README and test file to understand the task\n3. Implement or fix the solution in each subfolder\n4. Run: python run_gauntlet.py to test all 10 and see your score\n5. Flag printed when 8 or more challenges pass",
    category: "breadth-sprint",
    difficulty: "hard",
    points: 1000,
    flag: "CTF{gauntlet_sprint_8_of_10_complete}",
    hints: [
      "Start with the challenges that play to your strengths — you only need 8 of 10",
      "Each challenge is independent — skip one that's taking too long and come back later",
      "The async, cache, and sort challenges are often the quickest to solve",
    ],
    sortOrder: 17,
    tier: 5,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["run_gauntlet.py"],
  },
];

async function main() {
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Drop and recreate tables (handles schema migration from tool -> tier)
  await client.batch(
    [
      `DROP TABLE IF EXISTS submissions`,
      `DROP TABLE IF EXISTS challenges`,
      `DROP TABLE IF EXISTS participants`,
      `DROP TABLE IF EXISTS events`,
    ],
    "write"
  );

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        join_code TEXT UNIQUE NOT NULL,
        starts_at TEXT,
        ends_at TEXT,
        is_active INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        event_id TEXT REFERENCES events(id),
        joined_at TEXT DEFAULT (datetime('now')),
        total_points INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        event_id TEXT REFERENCES events(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        points INTEGER NOT NULL,
        tier INTEGER NOT NULL DEFAULT 1,
        flag TEXT NOT NULL,
        hints TEXT,
        sort_order INTEGER DEFAULT 0,
        starter_url TEXT,
        validation_type TEXT DEFAULT 'flag',
        required_files TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        participant_id TEXT REFERENCES participants(id),
        challenge_id TEXT REFERENCES challenges(id),
        submitted_flag TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        points_awarded INTEGER DEFAULT 0,
        submitted_at TEXT DEFAULT (datetime('now'))
      )`,
    ],
    "write"
  );

  // Create default event
  const eventId = nanoid();
  const joinCode = "YUMCTF";

  await client.execute({
    sql: "INSERT INTO events (id, name, join_code, is_active) VALUES (?, ?, ?, 1)",
    args: [eventId, "Yum! Brands AI Coding CTF", joinCode],
  });

  console.log(`Created event with join code: ${joinCode}`);

  // Insert challenges
  const stmts = challenges.map((ch) => ({
    sql: `INSERT OR REPLACE INTO challenges (id, event_id, title, description, category, difficulty, points, tier, flag, hints, sort_order, starter_url, validation_type, required_files)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      nanoid(),
      eventId,
      ch.title,
      ch.description,
      ch.category,
      ch.difficulty,
      ch.points,
      ch.tier,
      ch.flag,
      JSON.stringify(ch.hints),
      ch.sortOrder,
      ch.starterUrl || null,
      ch.validationType || "flag",
      ch.requiredFiles ? JSON.stringify(ch.requiredFiles) : null,
    ],
  }));

  await client.batch(stmts, "write");

  console.log(`Seeded ${challenges.length} challenges`);
  console.log(`\nEvent: Yum! Brands AI Coding CTF`);
  console.log(`Join Code: ${joinCode}`);
  console.log(`Status: Active`);
  console.log(`\nRun 'npm run dev' to start the server`);

  client.close();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
