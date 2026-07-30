CREATE TABLE `hydration_entries` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`amount_ml` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hydration_owner_recorded_idx` ON `hydration_entries` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`time` text NOT NULL,
	`name` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`kcal` integer NOT NULL,
	`protein_grams` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meals_owner_recorded_idx` ON `meals` (`user_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`position` integer NOT NULL,
	`weight_grams` integer NOT NULL,
	`reps` integer NOT NULL,
	`rir_milli` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_sets_owner_workout_idx` ON `workout_sets` (`user_id`,`workout_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`completed_at` integer NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`completed_sets` integer NOT NULL,
	`total_sets` integer NOT NULL,
	`exercise_count` integer NOT NULL,
	`volume` integer NOT NULL,
	`average_rir_milli` integer NOT NULL,
	`best_set` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workouts_owner_completed_idx` ON `workouts` (`user_id`,`completed_at`);