import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "ctf.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-create tables if they don't exist
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
