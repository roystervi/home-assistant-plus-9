CREATE TABLE `nvr_storage_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`capacity_gb` integer DEFAULT 0 NOT NULL,
	`used_gb` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nvr_storage_locations_name_unique` ON `nvr_storage_locations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `nvr_storage_locations_path_unique` ON `nvr_storage_locations` (`path`);