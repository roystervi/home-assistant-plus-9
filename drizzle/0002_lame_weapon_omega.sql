CREATE TABLE `cameras` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`connection_type` text NOT NULL,
	`url` text NOT NULL,
	`username` text,
	`password` text,
	`status` text DEFAULT 'connecting' NOT NULL,
	`format` text,
	`resolution` text,
	`ha_entity` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`camera_id` integer NOT NULL,
	`filename` text NOT NULL,
	`timestamp` text NOT NULL,
	`duration` integer DEFAULT 0,
	`size` real DEFAULT 0,
	`trigger` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`camera_id`) REFERENCES `cameras`(`id`) ON UPDATE no action ON DELETE no action
);
