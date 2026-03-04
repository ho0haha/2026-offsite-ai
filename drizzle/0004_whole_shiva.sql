CREATE TABLE `boardroom_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`character` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`message_number` integer NOT NULL,
	`timestamp` text,
	FOREIGN KEY (`session_id`) REFERENCES `boardroom_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `boardroom_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`message_counts` text DEFAULT '{}' NOT NULL,
	`flag_attempts` integer DEFAULT 0,
	`total_messages` integer DEFAULT 0,
	`is_complete` integer DEFAULT false,
	`started_at` text,
	`completed_at` text,
	`abandoned_at` text,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hint_reveals` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text,
	`challenge_id` text,
	`hint_index` integer NOT NULL,
	`cost` integer NOT NULL,
	`revealed_at` text,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
