import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";

// Starter code is now served through the tier-gated /api/starter/{N} endpoint.
// No external URLs needed — bundles are embedded in the server deployment.

const challenges = [
  // ── Tier 1: Warm-up (4 challenges) ──────────────────────────────────
  {
    title: "Hello AI",
    description:
      "Given docstring specs for 3 Python functions, use your AI coding assistant to generate implementations that pass the provided pytest suite.\n\nYour task:\n1. Open starter.py — you'll see 3 functions with detailed docstrings but empty bodies\n2. Use your AI tool's code generation to implement each function\n3. Run the pytest suite: python -m pytest test_solution.py\n4. When all 9 tests pass, the test harness prints the flag",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{hello_ai_w3lc0me_2_th3_ctf}",
    hints: [],
    sortOrder: 1,
    tier: 1,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["starter.py"],
  },
  {
    title: "Bug Squash",
    description:
      "A Python script has 3 planted bugs: an off-by-one error, a wrong operator, and a missing return statement.\n\nYour task:\n1. Open buggy_script.py in your AI coding assistant\n2. Ask your AI coding assistant to identify and fix all bugs\n3. Apply the fixes\n4. Run: python buggy_script.py\n5. When the script runs correctly, it auto-submits your solution",
    category: "warm-up",
    difficulty: "easy",
    points: 50,
    flag: "FLAG{bug_squash_d3bugg1ng_pr0}",
    hints: [],
    sortOrder: 2,
    tier: 1,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["buggy_script.py"],
  },
  {
    title: "The Broken Order System",
    description:
      "A FastAPI ordering API has 5 subtle bugs across 4 files (~300 lines total): an off-by-one error, wrong status code, missing validation, incorrect calculation, and an edge case failure.\n\nYour task:\n1. Open the app/ directory in your AI coding assistant\n2. Run the test suite: python -m pytest tests/test_orders.py — 9 of 21 tests fail\n3. Use your AI tool's multi-file capabilities to identify and fix all 5 bugs\n4. When all 21 tests pass, your solution is auto-submitted",
    category: "debugging",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{broken_orders_5_bugs_fixed}",
    hints: [],
    sortOrder: 3,
    tier: 1,
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
    hints: [],
    sortOrder: 4,
    tier: 1,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["app/server.py"],
  },
  // ── Tier 2: Intermediate (3 challenges) ─────────────────────────────
  {
    title: "Spaghetti Untangler",
    description:
      "A single 400-line Python function processes restaurant orders with deeply nested ifs, magic numbers, and duplicated logic.\n\nYour task:\n1. Open order_processor.py in your AI coding assistant\n2. Refactor into clean, modular code\n3. Requirements: all original tests still pass, no function exceeds 30 lines, at least 6 functions\n4. Run: python -m pytest test_processor.py\n5. When all behavior tests AND structural checks pass, the flag is printed",
    category: "refactoring",
    difficulty: "hard",
    points: 250,
    flag: "FLAG{spaghetti_untangled_cl34n_c0de}",
    hints: [],
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
    hints: [],
    sortOrder: 6,
    tier: 2,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["test_inventory.py"],
  },
  {
    title: "Spec Builder + Build",
    description:
      'Two-phase challenge: write a PRD then build from it.\n\nBrief: "Yum wants a way for store managers to track daily food waste and see trends. It should be simple and help reduce waste by 10%."\n\nPhase 1 — PRD:\n1. Use your AI coding assistant conversationally to flesh out the brief into a complete PRD\n2. PRD must include: 3+ user stories ("As a... I want... So that..."), 5+ acceptance criteria, edge cases/error handling section, technical approach section\n3. Save as prd.md and validate: python prd_validator.py prd.md\n\nPhase 2 — Build:\n4. Use your AI coding assistant to build a working Python implementation from your PRD\n5. Run: bash validate.sh\n6. Flag printed when both PRD and implementation pass validation',
    category: "spec-to-feature",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{spec_builder_prd_2_pr0duct}",
    hints: [],
    sortOrder: 7,
    tier: 2,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["prd.md"],
  },
  {
    title: "AI Menu Assistant",
    description:
      "Build a Python CLI chatbot that uses Claude to answer customer questions about a restaurant menu.\n\nYour task:\n1. menu.json contains the full menu (items, prices, ingredients, allergens)\n2. Build a script that takes a question and returns an accurate answer using ctf_helper.ask_llm()\n3. The LLM proxy is built in — no API key needed\n4. Run: python test_chatbot.py\n5. The test harness sends 10 questions — flag printed when 8/10 pass",
    category: "building-with-llms",
    difficulty: "medium",
    points: 300,
    flag: "FLAG{ai_menu_assistant_8_of_10}",
    hints: [],
    sortOrder: 8,
    tier: 3,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["chatbot.py"],
  },
  // ── Tier 3: Advanced (3 challenges) ─────────────────────────────────
  {
    title: "Smart Feedback Sorter",
    description:
      "Build a Python script that uses Claude to categorize 50 customer feedback entries.\n\nYour task:\n1. feedback.csv has 50 entries to categorize into: service, food quality, wait time, cleanliness, other\n2. Each entry also needs sentiment: positive or negative\n3. Use ctf_helper.ask_llm() to call Claude Haiku via the server proxy (no API key needed)\n4. Output results to output.csv\n5. Run: python validate.py — flag at 85%+ accuracy against ground truth",
    category: "building-with-llms",
    difficulty: "medium",
    points: 250,
    flag: "FLAG{smart_sorter_85_percent_acc}",
    hints: [],
    sortOrder: 9,
    tier: 3,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["output.csv"],
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
      { text: "Start by reading FEATURE_SPEC.md and identifying which 6 files need changes", cost: 100 },
      { text: "Use your AI tool's file reference features to include all relevant files", cost: 150 },
      { text: "Consider creating a project context file to help your AI tool understand the project structure", cost: 250 },
    ],
    sortOrder: 10,
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
  // ── Tier 4: Hard (3 challenges) ─────────────────────────────────────
  {
    title: "Prompt Craftsman",
    description:
      "5 prompt engineering mini-challenges. Each gives you a Python function and a task.\n\nChallenges:\n1. Generate comprehensive docstrings for a complex function\n2. Identify a subtle bug pattern across 3 similar functions\n3. Suggest a performance optimization with before/after code\n4. Explain time complexity in plain English\n5. Write a database migration plan from the code diff\n\nYour prompts must produce output matching specific criteria. Run: python validate_all.py to check all 5 and get the flag.",
    category: "advanced-mastery",
    difficulty: "medium",
    points: 200,
    flag: "FLAG{prompt_craftsman_5_for_5}",
    hints: [],
    sortOrder: 11,
    tier: 4,
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
    title: "Full Stack Sprint",
    description:
      "Build a complete restaurant store locator from scratch: FastAPI backend + HTML/JS frontend + SQLite database.\n\nYour task:\n1. data/stores.csv has 500 store locations (lat/lng, city, brand, features)\n2. Build: search by city, distance-based nearest stores, filter by brand\n3. No starter code — build everything from scratch using your AI coding assistant\n4. Run: python test_e2e.py\n5. End-to-end test suite validates all features — flag on pass",
    category: "bonus",
    difficulty: "hard",
    points: 500,
    flag: "FLAG{full_stack_sprint_st0re_l0cat0r}",
    hints: [
      { text: "The test expects your app at app/main.py with a FastAPI `app` object. It tests: GET /, GET /api/stores, GET /api/stores?city=..., GET /api/stores?brand=..., and a nearest-store endpoint with lat/lng params.", cost: 100 },
      { text: "Import stores.csv into SQLite at startup. The nearest-store endpoint needs the Haversine formula for distance-based sorting using lat/lng coordinates.", cost: 200 },
      { text: "The test checks exact field names: id, name, brand, city, latitude, longitude (not lat/lng). The nearest endpoint must return a distance_miles field (numeric, >= 0), sorted ascending. Also implement GET /api/brands and GET /api/cities.", cost: 300 },
    ],
    sortOrder: 12,
    tier: 4,
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
      { text: "Layer 1: process_order() returns a string instead of an OrderResult dataclass. Look at the return statements in processor.py — the final return builds a string, not the result object.", cost: 100 },
      { text: "Layer 2: apply_discount() uses strict greater-than (>) instead of greater-than-or-equal (>=) for tier boundaries. Orders of exactly $50 and $100 miss their discount tier.", cost: 200 },
      { text: "Layers 5-7: flatten_modifiers() hits Python's recursion limit on deeply nested dicts (use iteration instead), deduct_stock has a thread-safety race condition with concurrent orders, and the confirmation message uses .format() which breaks on item names containing curly braces.", cost: 300 },
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
      { text: "Use Python's Decimal type (not float) for all monetary math in calculate_bill. Round with quantize(Decimal('0.01')) at each step — float rounding will fail the invariant checks.", cost: 100 },
      { text: "For schedule_reservation: convert all times to UTC before comparing overlaps. Use pytz.timezone(tz).localize() and catch NonExistentTimeError and AmbiguousTimeError for DST edge cases.", cost: 200 },
      { text: "parse_order must return ParseError (not raise) for empty strings, unrecognized items, and quantities ≤ 0. reconcile_inventory: audit entries must be chronologically sorted and running totals must never go negative.", cost: 350 },
    ],
    sortOrder: 14,
    tier: 5,
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
      { text: "Every response — including errors — has a 'next' or 'hint' field pointing you forward. Follow the breadcrumb chain from GET /health. Don't guess endpoints; let the API guide you.", cost: 100 },
      { text: "Authentication uses HMAC-SHA256. POST to the auth/discover endpoint to get the shared secret and signing format. Sign: HMAC-SHA256(secret, timestamp + METHOD + path). Send X-Signature and X-Timestamp headers, then exchange for a Bearer token.", cost: 200 },
      { text: "The final step involves a receipt with base64-encoded verification_data. Decode it to get a JSON object with order_id, total, payment_id, and verification_code, then POST that object to /api/verify.", cost: 300 },
    ],
    sortOrder: 15,
    tier: 5,
    starterUrl: null,
    validationType: "server",
    requiredFiles: ["solution.py"],
  },
  {
    title: "The Agent Maze",
    description:
      "Build a Python AI agent that autonomously navigates a randomized puzzle maze. The maze regenerates on every new session — you can't hardcode the solution.\n\nYour task:\n1. Start the maze server: python maze_server.py\n2. Study agent_template.py — it has the API client boilerplate and session management\n3. Build an agent that solves 10 different puzzle types (math, cipher, logic, pattern, graph, and more)\n4. Collect all 10 tokens across ~20 rooms. Watch out for trap rooms and dead ends.\n5. Sessions expire after 10 minutes or 100 API calls. Submit tokens to get the flag.\n\nYour agent can use ctf_helper.ask_llm() to call Claude Haiku for reasoning about puzzles (no API key needed).",
    category: "agent-building",
    difficulty: "hard",
    points: 1000,
    flag: "CTF{maze_agent_autonomous_navigator}",
    hints: [
      { text: "The maze API: GET /api/maze/start (new session), POST /api/maze/action with {action:'solve'|'move'|'look', data:{...}}, GET /api/maze/status, POST /api/maze/submit (claim flag). Sessions expire after 10 min or 100 API calls — budget carefully.", cost: 150 },
      { text: "Some puzzles reference variables from earlier rooms (e.g., 'What was X from Room 3?'). Store a dict of room_id → solved variables so your agent can look them up when a puzzle demands cross-room context.", cost: 300 },
      { text: "There are 3 trap rooms with plausible-looking puzzles that have impossible constraints, and 2 ambiguity rooms. If a solve attempt fails repeatedly, it's likely a trap — move to a different exit instead of retrying.", cost: 500 },
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
      "10 independent mini-challenges spanning async bugs, SQL optimization, regex, custom sorting, rate limiting, log parsing, memory leaks, LRU caches, schema migrations, and stream processing. Complete 9 out of 10 to get the flag.\n\nYour task:\n1. Explore the gauntlet/ directory — each subfolder (01_async through 10_stream) is a self-contained challenge\n2. Read each challenge's README and test file to understand the task\n3. Implement or fix the solution in each subfolder\n4. Run: python run_gauntlet.py to test all 10 and see your score\n5. Flag printed when 9 or more challenges pass",
    category: "breadth-sprint",
    difficulty: "hard",
    points: 1000,
    flag: "CTF{gauntlet_sprint_9_of_10_complete}",
    hints: [
      { text: "You need 9 of 10. Quickest wins: 04_sort (custom comparator with Unicode-aware collation), 08_cache (LRU with TTL expiration), and 03_regex (single pattern with named capture groups for hours strings).", cost: 150 },
      { text: "01_async needs asyncio.Lock around the shared list operations. 07_memleak has two leaks: an ever-growing request log list that's never trimmed, and file handles opened in the handler that are never closed.", cost: 300 },
      { text: "02_sql: add indexes on (customer_id) and (order_id, product_id), then rewrite the N+1 query as a single JOIN. 09_migration: use INSERT INTO...SELECT with COALESCE for computed columns and handle the table split.", cost: 500 },
    ],
    sortOrder: 17,
    tier: 6,
    starterUrl: null,
    validationType: "upload",
    requiredFiles: ["run_gauntlet.py"],
  },
  {
    title: "Only Murders at 127.0.0.1",
    description:
      "Tech founder Julian Voss was hosting an exclusive demo night at his downtown Chicago penthouse. At 11:47 PM, he was found dead at his desk. Six guests remain in the building.\n\nYour job: figure out who killed him, how they did it, and why.\n\nThe Setup:\n- Six AI-powered suspects available for questioning through the CTF server API\n- Each has their own personality, secrets, and agenda\n- The crime scene can be examined for physical evidence\n\nRules:\n- 4 messages per character (24 total across all 6)\n- 3 conversation modes: private (1-on-1), group (2-3 characters together), confront (present evidence)\n- 4 crime scene examinations total — choose which areas to examine carefully\n- 3 accusation attempts — choose wisely\n\nMake a formal accusation with: suspect (who), method (how), and motive (why).\n\nSuspects: Diana Croft, Marcus Webb, Suki Tanaka, Raj Patel, Elena Vasquez, Tommy Zhao",
    category: "investigation",
    difficulty: "hard",
    points: 1000,
    flag: "__DYNAMIC__",
    hints: [
      { text: "Examine the desk and bar areas first — the desk reveals timeline clues about the victim's deterioration, and the bar has forensic evidence about the method.", cost: 150 },
      { text: "Use group conversations to force contradictions. Pairing suspects who claim to have been in different places at the same time is especially productive — try combining people who are deflecting blame.", cost: 300 },
      { text: "Each character has specific 'crack conditions' — presenting the right evidence to the right person unlocks critical testimony. Use confront mode with physical evidence that directly contradicts a suspect's alibi.", cost: 500 },
    ],
    sortOrder: 18,
    tier: 6,
    starterUrl: null,
    validationType: "server",
    requiredFiles: null as unknown as string[],
  },
  {
    title: "Roy G Biv",
    description:
      "You've intercepted a mysterious file encoded in the .rgbiv image format. Your mission: decode it, understand what you see, and extract the hidden flag.\n\nThe File:\nspectrum.rgbiv — a binary image file using a custom format with CRLE compression.\n\nYour task:\n1. Study the .rgbiv format specification (32-byte header, palette, CRLE compression)\n2. Build a decoder that handles all CRLE opcodes: LITERAL, REPEAT, COPY_PREV, DELTA_RUN, FILL_PAIR, NESTED_REPEAT, ROW_COPY, END\n3. Pay attention to header flags: has_data_row, delta_mode, fill_order\n4. Decode the image and examine what you see\n5. The image contains seven visual elements, each holding a two-digit number\n6. The numbers form a key that unlocks hidden data in the image\n\nSubmit the flag in the format CTF{...}",
    category: "reverse-engineering",
    difficulty: "hard",
    points: 1000,
    flag: "CTF{pr1sm_d3c0d3d_r41nb0w_m4st3r}",
    hints: [
      { text: "Parse the full 32-byte header — bytes 0x0C contain flags (has_data_row, delta_mode, fill_order as bits), and 0x0D-0x0F contain data_row_index and data_row_length. The has_data_row flag means one row contains hidden encoded data, not just visual pixels.", cost: 150 },
      { text: "NESTED_REPEAT (opcode 101) decodes the NEXT instruction as its inner payload, then repeats that full output N+1 times. DELTA_RUN uses signed int8 for delta — byte values 128-255 represent negative deltas (-128 to -1). Get these wrong and the image will be garbled.", cost: 300 },
      { text: "After decoding the image, extract the data row (at the index from the header, for data_row_length bytes). These palette indices encode the flag. Map them back through the palette or interpret them directly as ASCII character codes.", cost: 500 },
    ],
    sortOrder: 19,
    tier: 6,
    starterUrl: null,
    validationType: "flag",
    requiredFiles: null as unknown as string[],
  },
  // ── Tier 7: Legendary (1 challenge) ─────────────────────────────────
  {
    title: "A Prison of My Own Design",
    description:
      "The final challenge. No local files. No test suite. Just you, your AI, and a terminal.\n\nClick 'Play' to begin.",
    category: "escape-room",
    difficulty: "legendary",
    points: 2000,
    flag: "__DYNAMIC__",
    hints: [
      { text: "Start by examining your cell carefully. The walls have stories to tell.", cost: 100 },
      { text: "Be polite to everyone you meet. First impressions are permanent.", cost: 150 },
      { text: "The Padre always tells the truth. Others... not so much.", cost: 250 },
      { text: "Chapter and verse. The cross knows the way.", cost: 500 },
    ],
    sortOrder: 20,
    tier: 7,
    starterUrl: null,
    validationType: "server",
    requiredFiles: null as unknown as string[],
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
      `DROP TABLE IF EXISTS murder_messages`,
      `DROP TABLE IF EXISTS murder_sessions`,
      `DROP TABLE IF EXISTS boardroom_messages`,
      `DROP TABLE IF EXISTS boardroom_sessions`,
      `DROP TABLE IF EXISTS game_commands`,
      `DROP TABLE IF EXISTS game_sessions`,
      `DROP TABLE IF EXISTS hint_reveals`,
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
        total_points INTEGER DEFAULT 0,
        secret_key TEXT,
        modem_activated INTEGER DEFAULT 0,
        nuked_at TEXT,
        nuked_by TEXT,
        nukes_launched INTEGER DEFAULT 0,
        wopr_disconnects INTEGER DEFAULT 0,
        disk_wiped INTEGER DEFAULT 0
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
      `CREATE TABLE IF NOT EXISTS hint_reveals (
        id TEXT PRIMARY KEY,
        participant_id TEXT REFERENCES participants(id),
        challenge_id TEXT REFERENCES challenges(id),
        hint_index INTEGER NOT NULL,
        cost INTEGER NOT NULL,
        revealed_at TEXT DEFAULT (datetime('now'))
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
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(id),
        event_id TEXT NOT NULL REFERENCES events(id),
        state TEXT NOT NULL,
        turn_count INTEGER DEFAULT 0,
        started_at TEXT DEFAULT (datetime('now')),
        last_command_at TEXT,
        is_complete INTEGER DEFAULT 0,
        escaped INTEGER DEFAULT 0,
        abandoned_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS game_commands (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES game_sessions(id),
        turn_number INTEGER NOT NULL,
        command TEXT NOT NULL,
        response TEXT NOT NULL,
        room_id TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS murder_sessions (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL REFERENCES participants(id),
        event_id TEXT NOT NULL REFERENCES events(id),
        message_counts TEXT NOT NULL DEFAULT '{}',
        accusation_attempts INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        scene_examinations TEXT NOT NULL DEFAULT '[]',
        is_complete INTEGER DEFAULT 0,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        abandoned_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS murder_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES murder_sessions(id),
        character TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        message_number INTEGER NOT NULL,
        mode TEXT NOT NULL DEFAULT 'private',
        timestamp TEXT DEFAULT (datetime('now'))
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
