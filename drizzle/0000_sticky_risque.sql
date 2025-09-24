CREATE TABLE `energy_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`billing_month` text NOT NULL,
	`total_kwh_used` real NOT NULL,
	`basic_monthly_charge` real DEFAULT 17.5 NOT NULL,
	`energy_charge_tier1_kwh` real DEFAULT 0 NOT NULL,
	`energy_charge_tier1_rate` real DEFAULT 0.06846 NOT NULL,
	`energy_charge_tier1_cost` real DEFAULT 0 NOT NULL,
	`energy_charge_tier2_kwh` real DEFAULT 0 NOT NULL,
	`energy_charge_tier2_rate` real DEFAULT 0.08346 NOT NULL,
	`energy_charge_tier2_cost` real DEFAULT 0 NOT NULL,
	`fuel_cost` real DEFAULT 0 NOT NULL,
	`franchise_fee` real DEFAULT 0 NOT NULL,
	`gross_receipts_tax` real DEFAULT 0 NOT NULL,
	`public_service_tax` real DEFAULT 0 NOT NULL,
	`total_bill_amount` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `energy_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_id` text NOT NULL,
	`friendly_name` text NOT NULL,
	`reading_date` text NOT NULL,
	`kwh_value` real NOT NULL,
	`daily_kwh` real DEFAULT 0 NOT NULL,
	`weekly_kwh` real DEFAULT 0 NOT NULL,
	`monthly_kwh` real DEFAULT 0 NOT NULL,
	`reading_type` text DEFAULT 'main' NOT NULL,
	`created_at` text NOT NULL
);
