CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`assignee` text NOT NULL,
	`description` text NOT NULL,
	`notes` text NOT NULL,
	`status` text NOT NULL,
	`creator` text NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
