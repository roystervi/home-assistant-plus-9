CREATE TABLE `user_background_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`background_mode` text DEFAULT 'default' NOT NULL,
	`custom_bg_color` text,
	`background_image` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_background_settings_user_id_unique` ON `user_background_settings` (`user_id`);--> statement-breakpoint
ALTER TABLE `automations` DROP COLUMN `triggers`;--> statement-breakpoint
ALTER TABLE `automations` DROP COLUMN `conditions`;--> statement-breakpoint
ALTER TABLE `automations` DROP COLUMN `actions`;