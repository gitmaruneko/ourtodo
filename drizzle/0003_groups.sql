CREATE TABLE `app_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_groups_invite_code_unique` ON `app_groups` (`invite_code`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `group_id` text DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
CREATE INDEX `tasks_group_date_idx` ON `tasks` (`group_id`,`date`);
--> statement-breakpoint
INSERT INTO `app_groups` (`id`,`name`,`invite_code`,`created_by`,`created_at`)
VALUES ('legacy','原有共用清單',lower(hex(randomblob(16))),'',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
--> statement-breakpoint
INSERT INTO `group_members` (`group_id`,`user_id`,`role`,`joined_at`)
SELECT 'legacy',`user_id`,'member',`created_at` FROM `members` WHERE `status`='approved';
