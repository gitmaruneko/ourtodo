CREATE TABLE `group_join_requests` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`requested_at` text NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `group_join_requests_user_idx` ON `group_join_requests` (`user_id`);