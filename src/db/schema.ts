import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

export const energyBills = sqliteTable('energy_bills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  billingMonth: text('billing_month').notNull(),
  totalKwhUsed: real('total_kwh_used').notNull(),
  basicMonthlyCharge: real('basic_monthly_charge').notNull().default(17.50),
  energyChargeTier1Kwh: real('energy_charge_tier1_kwh').notNull().default(0),
  energyChargeTier1Rate: real('energy_charge_tier1_rate').notNull().default(0.06846),
  energyChargeTier1Cost: real('energy_charge_tier1_cost').notNull().default(0),
  energyChargeTier2Kwh: real('energy_charge_tier2_kwh').notNull().default(0),
  energyChargeTier2Rate: real('energy_charge_tier2_rate').notNull().default(0.08346),
  energyChargeTier2Cost: real('energy_charge_tier2_cost').notNull().default(0),
  fuelCost: real('fuel_cost').notNull().default(0),
  franchiseFee: real('franchise_fee').notNull().default(0),
  grossReceiptsTax: real('gross_receipts_tax').notNull().default(0),
  publicServiceTax: real('public_service_tax').notNull().default(0),
  totalBillAmount: real('total_bill_amount').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const energyReadings = sqliteTable('energy_readings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityId: text('entity_id').notNull(),
  friendlyName: text('friendly_name').notNull(),
  readingDate: text('reading_date').notNull(),
  kwhValue: real('kwh_value').notNull(),
  dailyKwh: real('daily_kwh').notNull().default(0),
  weeklyKwh: real('weekly_kwh').notNull().default(0),
  monthlyKwh: real('monthly_kwh').notNull().default(0),
  readingType: text('reading_type').notNull().default('main'),
  createdAt: text('created_at').notNull(),
});

export const automations = sqliteTable('automations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  lastRun: text('last_run'),
  source: text('source').notNull().default('local'),
  tags: text('tags', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const automationTriggers = sqliteTable('automation_triggers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  automationId: integer('automation_id').references(() => automations.id),
  type: text('type').notNull(),
  entityId: text('entity_id'),
  attribute: text('attribute'),
  state: text('state'),
  time: text('time'),
  offset: integer('offset'),
  topic: text('topic'),
  payload: text('payload'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const automationConditions = sqliteTable('automation_conditions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  automationId: integer('automation_id').references(() => automations.id),
  type: text('type').notNull(),
  entityId: text('entity_id'),
  attribute: text('attribute'),
  operator: text('operator').notNull(),
  value: text('value').notNull(),
  logicalOperator: text('logical_operator').default('and'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const automationActions = sqliteTable('automation_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  automationId: integer('automation_id').references(() => automations.id),
  type: text('type').notNull(),
  service: text('service'),
  entityId: text('entity_id'),
  data: text('data', { mode: 'json' }),
  topic: text('topic'),
  payload: text('payload'),
  sceneId: text('scene_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const cameras = sqliteTable('cameras', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  connectionType: text('connection_type').notNull(),
  url: text('url').notNull(),
  username: text('username'),
  password: text('password'),
  status: text('status').notNull().default('connecting'),
  format: text('format'),
  resolution: text('resolution'),
  haEntity: text('ha_entity'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const nvrStorageLocations = sqliteTable('nvr_storage_locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  path: text('path').notNull().unique(),
  type: text('type').notNull(),
  capacityGb: integer('capacity_gb').notNull().default(0),
  usedGb: integer('used_gb').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const recordings = sqliteTable('recordings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cameraId: integer('camera_id').references(() => cameras.id).notNull(),
  filename: text('filename').notNull(),
  timestamp: text('timestamp').notNull(),
  duration: integer('duration').default(0),
  size: real('size').default(0.00),
  trigger: text('trigger').notNull(),
  storageLocationId: integer('storage_location_id').references(() => nvrStorageLocations.id),
  createdAt: text('created_at').notNull(),
});

export const userBackgroundSettings = sqliteTable('user_background_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  backgroundMode: text('background_mode').notNull().default('default'),
  customBgColor: text('custom_bg_color'),
  backgroundImage: text('background_image'),
  updatedAt: text('updated_at').notNull(),
});

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'audio' or 'video'
  filePath: text('file_path').notNull(),
  duration: integer('duration').notNull().default(0), // in seconds
  artist: text('artist'),
  album: text('album'),
  genre: text('genre'),
  year: integer('year'),
  folder: text('folder'),
  userId: text('user_id').notNull().references(() => user.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id),
  settings: text('settings', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  userIdIdx: index('user_settings_user_id_idx').on(table.userId),
}));

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: integer("google_token_expiry", { mode: "timestamp" }),
  googleCalendarId: text("google_calendar_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const googleCalendarTokens = sqliteTable('google_calendar_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiry: text('token_expiry').notNull(),
  scope: text('scope'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const googleCalendars = sqliteTable('google_calendars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: text('token_type').notNull().default('Bearer'),
  scope: text('scope').notNull().default('https://www.googleapis.com/auth/calendar.readonly'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastRefreshed: integer('last_refreshed', { mode: 'timestamp' }),
  lastSynced: integer('last_synced', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  userIdIdx: index('google_calendars_user_id_idx').on(table.userId),
  expiresAtIdx: index('google_calendars_expires_at_idx').on(table.expiresAt),
}));