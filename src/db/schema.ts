import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  joinCode: text("join_code").unique().notNull(),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
});

export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  eventId: text("event_id").references(() => events.id),
  joinedAt: text("joined_at").$defaultFn(() => new Date().toISOString()),
  totalPoints: integer("total_points").default(0),
  secretKey: text("secret_key"),
  modemActivated: integer("modem_activated", { mode: "boolean" }).default(false),
  nukedAt: text("nuked_at"),
  nukedBy: text("nuked_by"),
  nukesLaunched: integer("nukes_launched").default(0),
  woprDisconnects: integer("wopr_disconnects").default(0),
  diskWiped: integer("disk_wiped", { mode: "boolean" }).default(false),
});

export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  eventId: text("event_id").references(() => events.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  points: integer("points").notNull(),
  tier: integer("tier").notNull().default(1),
  flag: text("flag").notNull(),
  hints: text("hints"),
  sortOrder: integer("sort_order").default(0),
  starterUrl: text("starter_url"),
  validationType: text("validation_type").default("flag"),
  requiredFiles: text("required_files"),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  participantId: text("participant_id").references(() => participants.id),
  challengeId: text("challenge_id").references(() => challenges.id),
  submittedFlag: text("submitted_flag").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  pointsAwarded: integer("points_awarded").default(0),
  submittedAt: text("submitted_at").$defaultFn(() => new Date().toISOString()),
});

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .references(() => participants.id)
    .notNull(),
  eventId: text("event_id")
    .references(() => events.id)
    .notNull(),
  state: text("state").notNull(), // JSON blob of GameState
  turnCount: integer("turn_count").default(0),
  startedAt: text("started_at").$defaultFn(() => new Date().toISOString()),
  lastCommandAt: text("last_command_at"),
  isComplete: integer("is_complete", { mode: "boolean" }).default(false),
  escaped: integer("escaped", { mode: "boolean" }).default(false),
  abandonedAt: text("abandoned_at"),
});

export const hintReveals = sqliteTable("hint_reveals", {
  id: text("id").primaryKey(),
  participantId: text("participant_id").references(() => participants.id),
  challengeId: text("challenge_id").references(() => challenges.id),
  hintIndex: integer("hint_index").notNull(),
  cost: integer("cost").notNull(),
  revealedAt: text("revealed_at").$defaultFn(() => new Date().toISOString()),
});

export const gameCommands = sqliteTable("game_commands", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .references(() => gameSessions.id)
    .notNull(),
  turnNumber: integer("turn_number").notNull(),
  command: text("command").notNull(),
  response: text("response").notNull(), // truncated to 500 chars
  roomId: text("room_id").notNull(),
  timestamp: text("timestamp").$defaultFn(() => new Date().toISOString()),
});

// ---------------------------------------------------------------------------
// Challenge 18: Only Murders at 127.0.0.1
// ---------------------------------------------------------------------------

export const murderSessions = sqliteTable("murder_sessions", {
  id: text("id").primaryKey(),
  participantId: text("participant_id")
    .references(() => participants.id)
    .notNull(),
  eventId: text("event_id")
    .references(() => events.id)
    .notNull(),
  messageCounts: text("message_counts").notNull().default("{}"), // JSON: { character: count }
  accusationAttempts: integer("accusation_attempts").default(0),
  totalMessages: integer("total_messages").default(0),
  sceneExaminations: text("scene_examinations").notNull().default("[]"), // JSON array of examined areas
  isComplete: integer("is_complete", { mode: "boolean" }).default(false),
  startedAt: text("started_at").$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
  abandonedAt: text("abandoned_at"),
});

export const murderMessages = sqliteTable("murder_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .references(() => murderSessions.id)
    .notNull(),
  character: text("character").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  messageNumber: integer("message_number").notNull(), // per-character message index
  mode: text("mode").notNull().default("private"), // "private", "group", or "confront"
  timestamp: text("timestamp").$defaultFn(() => new Date().toISOString()),
});
