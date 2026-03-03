CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`points` integer NOT NULL,
	`tier` integer DEFAULT 1 NOT NULL,
	`flag` text NOT NULL,
	`hints` text,
	`sort_order` integer DEFAULT 0,
	`starter_url` text,
	`validation_type` text DEFAULT 'flag',
	`required_files` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`join_code` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`is_active` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_join_code_unique` ON `events` (`join_code`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`event_id` text,
	`joined_at` text,
	`total_points` integer DEFAULT 0,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`participant_id` text,
	`challenge_id` text,
	`submitted_flag` text NOT NULL,
	`is_correct` integer NOT NULL,
	`points_awarded` integer DEFAULT 0,
	`submitted_at` text,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenges`(`id`) ON UPDATE no action ON DELETE no action
);
