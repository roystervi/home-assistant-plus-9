import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

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