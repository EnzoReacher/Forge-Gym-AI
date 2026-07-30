CREATE TABLE `request_limits` (
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `action`, `window_start`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_limits_window_idx` ON `request_limits` (`window_start`);