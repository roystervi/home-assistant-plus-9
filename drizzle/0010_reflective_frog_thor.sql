CREATE TABLE `google_calendars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`token_type` text DEFAULT 'Bearer' NOT NULL,
	`scope` text DEFAULT 'https://www.googleapis.com/auth/calendar.readonly' NOT NULL,
	`expires_at` integer,
	`last_refreshed` integer,
	`last_synced` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `google_calendars_user_id_idx` ON `google_calendars` (`user_id`);--> statement-breakpoint
CREATE INDEX `google_calendars_expires_at_idx` ON `google_calendars` (`expires_at`);