CREATE TABLE `automation_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`automation_id` integer,
	`type` text NOT NULL,
	`service` text,
	`entity_id` text,
	`data` text,
	`topic` text,
	`payload` text,
	`scene_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `automation_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`automation_id` integer,
	`type` text NOT NULL,
	`entity_id` text,
	`attribute` text,
	`operator` text NOT NULL,
	`value` text NOT NULL,
	`logical_operator` text DEFAULT 'and',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `automation_triggers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`automation_id` integer,
	`type` text NOT NULL,
	`entity_id` text,
	`attribute` text,
	`state` text,
	`time` text,
	`offset` integer,
	`topic` text,
	`payload` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`automation_id`) REFERENCES `automations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `automations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true,
	`source` text DEFAULT 'local' NOT NULL,
	`tags` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_run` text
);
