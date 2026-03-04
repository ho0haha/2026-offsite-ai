ALTER TABLE `boardroom_sessions` ADD `accusation_attempts` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `boardroom_sessions` ADD `scene_examinations` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `boardroom_messages` ADD `mode` text DEFAULT 'private' NOT NULL;
