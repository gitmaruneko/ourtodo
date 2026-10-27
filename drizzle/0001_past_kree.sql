CREATE TABLE `members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `creator_user_id` text;