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
