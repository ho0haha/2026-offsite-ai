CREATE TABLE `game_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`turn_number` integer NOT NULL,
	`command` text NOT NULL,
	`response` text NOT NULL,
	`room_id` text NOT NULL,
	`timestamp` text,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`event_id` text NOT NULL,
	`state` text NOT NULL,
	`turn_count` integer DEFAULT 0,
	`started_at` text,
	`last_command_at` text,
	`is_complete` integer DEFAULT false,
	`escaped` integer DEFAULT false,
	`abandoned_at` text,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
