ALTER TABLE `user` ADD `google_access_token` text;--> statement-breakpoint
ALTER TABLE `user` ADD `google_refresh_token` text;--> statement-breakpoint
ALTER TABLE `user` ADD `google_token_expiry` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `google_calendar_id` text;