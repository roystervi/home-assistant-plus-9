import { z } from 'zod';

// Base interfaces
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

// Thermostat interfaces
interface ThermostatStatus {
  entity_id: string;
  current_temperature: number;
  target_temperature: number;
  hvac_mode: 'heat' | 'cool' | 'auto' | 'off' | 'heat_cool';
  hvac_action: 'heating' | 'cooling' | 'idle' | 'off';
  temperature_unit: 'C' | 'F';
  humidity?: number;
  preset_mode?: string;
  away_mode?: boolean;
}

interface ThermostatSchedule {
  schedule_name: string;
  periods: Array<{
    time: string;
    temperature: number;
    days: string[];
  }>;
}

// Alarm interfaces
interface AlarmStatus {
  entity_id: string;
  state: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered';
  last_changed: string;
  battery_level?: number;
  bypassed_sensors?: string[];
}

interface AlarmHistoryEntry {
  timestamp: string;
  event_type: 'armed' | 'disarmed' | 'triggered' | 'error';
  user: string;
  zone?: string;
  details: string;
}

// Energy interfaces
interface EnergyUsage {
  current_power: number;
  daily_consumption: number;
  monthly_consumption: number;
  cost_today: number;
  cost_month: number;
  peak_hours?: Array<{ start: string; end: string; }>;
}

interface EnergyBill {
  billing_period: string;
  total_kwh: number;
  total_cost: number;
  peak_usage: number;
  off_peak_usage: number;
  demand_charges: number;
  due_date: string;
}

interface EnergyTip {
  category: 'heating' | 'cooling' | 'lighting' | 'appliances' | 'general';
  tip: string;
  potential_savings: string;
  priority: 'high' | 'medium' | 'low';
}

// Device interfaces
interface DeviceInfo {
  entity_id: string;
  name: string;
  device_class?: string;
  state: string;
  unit_of_measurement?: string;
  friendly_name: string;
  icon?: string;
  supported_features?: number;
}

interface AutomationInfo {
  entity_id: string;
  name: string;
  state: 'on' | 'off';
  last_triggered?: string;
  mode: string;
}

// Dashboard interfaces
interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity: number;
  pressure: number;
  wind_speed: number;
  forecast: Array<{
    date: string;
    condition: string;
    temperature_low: number;
    temperature_high: number;
  }>;
}

interface CryptoStatus {
  portfolio_value: number;
  daily_change: number;
  daily_change_percent: number;
  holdings: Array<{
    symbol: string;
    amount: number;
    value: number;
    change_24h: number;
  }>;
}

interface CalendarEvent {
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  description?: string;
}

interface SystemStatus {
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_status: 'connected' | 'disconnected';
  last_backup?: string;
}

// Parameter schemas for validation
const setTemperatureSchema = z.object({
  entity_id: z.string(),
  temperature: z.number().min(-30).max(50),
  hvac_mode: z.enum(['heat', 'cool', 'auto', 'off']).optional()
});

const alarmControlSchema = z.object({
  entity_id: z.string(),
  code: z.string().optional(),
  mode: z.enum(['home', 'away', 'night']).optional()
});

const deviceControlSchema = z.object({
  entity_id: z.string(),
  state: z.union([z.string(), z.number(), z.boolean()]),
  attributes: z.record(z.any()).optional()
});

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

async function makeApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Thermostat Control Functions
 */

export async function setThermostatTemperature(params: {
  entity_id: string;
  temperature: number;
  hvac_mode?: 'heat' | 'cool' | 'auto' | 'off';
}): Promise<ApiResponse> {
  const validatedParams = setTemperatureSchema.parse(params);
  
  return makeApiRequest<ApiResponse>('/home-assistant/thermostat/set-temperature', {
    method: 'POST',
    body: JSON.stringify(validatedParams)
  });
}

export async function getThermostatStatus(entity_id?: string): Promise<{
  success: boolean;
  data: ThermostatStatus[];
  message: string;
}> {
  const endpoint = entity_id 
    ? `/home-assistant/thermostat/status?entity_id=${entity_id}`
    : '/home-assistant/thermostat/status';
    
  return makeApiRequest<{
    success: boolean;
    data: ThermostatStatus[];
    message: string;
  }>(endpoint);
}

export async function setHvacMode(params: {
  entity_id: string;
  hvac_mode: 'heat' | 'cool' | 'auto' | 'off' | 'heat_cool';
}): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/thermostat/set-hvac-mode', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getThermostatSchedules(entity_id: string): Promise<{
  success: boolean;
  data: ThermostatSchedule[];
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: ThermostatSchedule[];
    message: string;
  }>(`/home-assistant/thermostat/schedules?entity_id=${entity_id}`);
}

/**
 * Alarm System Functions
 */

export async function armAlarm(params: {
  entity_id: string;
  mode: 'home' | 'away' | 'night';
  code?: string;
}): Promise<ApiResponse> {
  const validatedParams = alarmControlSchema.parse(params);
  
  return makeApiRequest<ApiResponse>('/home-assistant/alarm/arm', {
    method: 'POST',
    body: JSON.stringify(validatedParams)
  });
}

export async function disarmAlarm(params: {
  entity_id: string;
  code?: string;
}): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/alarm/disarm', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getAlarmStatus(entity_id?: string): Promise<{
  success: boolean;
  data: AlarmStatus[];
  message: string;
}> {
  const endpoint = entity_id 
    ? `/home-assistant/alarm/status?entity_id=${entity_id}`
    : '/home-assistant/alarm/status';
    
  return makeApiRequest<{
    success: boolean;
    data: AlarmStatus[];
    message: string;
  }>(endpoint);
}

export async function getAlarmHistory(params: {
  entity_id?: string;
  days?: number;
}): Promise<{
  success: boolean;
  data: AlarmHistoryEntry[];
  message: string;
}> {
  const searchParams = new URLSearchParams();
  if (params.entity_id) searchParams.append('entity_id', params.entity_id);
  if (params.days) searchParams.append('days', params.days.toString());
  
  return makeApiRequest<{
    success: boolean;
    data: AlarmHistoryEntry[];
    message: string;
  }>(`/home-assistant/alarm/history?${searchParams.toString()}`);
}

/**
 * Energy Monitoring Functions
 */

export async function getCurrentEnergyUsage(): Promise<{
  success: boolean;
  data: EnergyUsage;
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: EnergyUsage;
    message: string;
  }>('/home-assistant/energy/current-usage');
}

export async function getEnergyBill(billing_period?: string): Promise<{
  success: boolean;
  data: EnergyBill;
  message: string;
}> {
  const endpoint = billing_period 
    ? `/home-assistant/energy/bill?period=${billing_period}`
    : '/home-assistant/energy/bill';
    
  return makeApiRequest<{
    success: boolean;
    data: EnergyBill;
    message: string;
  }>(endpoint);
}

export async function getEnergyHistory(params: {
  period: 'day' | 'week' | 'month' | 'year';
  entity_id?: string;
}): Promise<{
  success: boolean;
  data: Array<{
    timestamp: string;
    consumption: number;
    cost: number;
  }>;
  message: string;
}> {
  const searchParams = new URLSearchParams();
  searchParams.append('period', params.period);
  if (params.entity_id) searchParams.append('entity_id', params.entity_id);
  
  return makeApiRequest<{
    success: boolean;
    data: Array<{
      timestamp: string;
      consumption: number;
      cost: number;
    }>;
    message: string;
  }>(`/home-assistant/energy/history?${searchParams.toString()}`);
}

export async function getEnergyEfficiencyTips(): Promise<{
  success: boolean;
  data: EnergyTip[];
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: EnergyTip[];
    message: string;
  }>('/home-assistant/energy/efficiency-tips');
}

/**
 * General Device Functions
 */

export async function searchEntities(params: {
  query: string;
  domain?: string;
  device_class?: string;
}): Promise<{
  success: boolean;
  data: DeviceInfo[];
  message: string;
}> {
  const searchParams = new URLSearchParams();
  searchParams.append('query', params.query);
  if (params.domain) searchParams.append('domain', params.domain);
  if (params.device_class) searchParams.append('device_class', params.device_class);
  
  return makeApiRequest<{
    success: boolean;
    data: DeviceInfo[];
    message: string;
  }>(`/home-assistant/entities/search?${searchParams.toString()}`);
}

export async function getDeviceStatus(entity_id: string): Promise<{
  success: boolean;
  data: HomeAssistantEntity;
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: HomeAssistantEntity;
    message: string;
  }>(`/home-assistant/entities/status?entity_id=${entity_id}`);
}

export async function controlDevice(params: {
  entity_id: string;
  state: string | number | boolean;
  attributes?: Record<string, any>;
}): Promise<ApiResponse> {
  const validatedParams = deviceControlSchema.parse(params);
  
  return makeApiRequest<ApiResponse>('/home-assistant/entities/control', {
    method: 'POST',
    body: JSON.stringify(validatedParams)
  });
}

export async function toggleDevice(entity_id: string): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/entities/toggle', {
    method: 'POST',
    body: JSON.stringify({ entity_id })
  });
}

export async function getAutomations(): Promise<{
  success: boolean;
  data: AutomationInfo[];
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: AutomationInfo[];
    message: string;
  }>('/home-assistant/automations');
}

export async function triggerAutomation(entity_id: string): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/automations/trigger', {
    method: 'POST',
    body: JSON.stringify({ entity_id })
  });
}

export async function enableAutomation(entity_id: string): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/automations/enable', {
    method: 'POST',
    body: JSON.stringify({ entity_id })
  });
}

export async function disableAutomation(entity_id: string): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/home-assistant/automations/disable', {
    method: 'POST',
    body: JSON.stringify({ entity_id })
  });
}

/**
 * Dashboard Information Functions
 */

export async function getWeatherInfo(): Promise<{
  success: boolean;
  data: WeatherInfo;
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: WeatherInfo;
    message: string;
  }>('/home-assistant/weather');
}

export async function getCryptoStatus(): Promise<{
  success: boolean;
  data: CryptoStatus;
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: CryptoStatus;
    message: string;
  }>('/home-assistant/crypto');
}

export async function getCalendarEvents(params: {
  days_ahead?: number;
  calendar_entity?: string;
}): Promise<{
  success: boolean;
  data: CalendarEvent[];
  message: string;
}> {
  const searchParams = new URLSearchParams();
  if (params.days_ahead) searchParams.append('days_ahead', params.days_ahead.toString());
  if (params.calendar_entity) searchParams.append('calendar_entity', params.calendar_entity);
  
  return makeApiRequest<{
    success: boolean;
    data: CalendarEvent[];
    message: string;
  }>(`/home-assistant/calendar?${searchParams.toString()}`);
}

export async function getSystemStatus(): Promise<{
  success: boolean;
  data: SystemStatus;
  message: string;
}> {
  return makeApiRequest<{
    success: boolean;
    data: SystemStatus;
    message: string;
  }>('/home-assistant/system-status');
}

/**
 * Convenience Functions for Common Operations
 */

export async function getDashboardOverview(): Promise<{
  weather: WeatherInfo;
  crypto: CryptoStatus;
  calendar: CalendarEvent[];
  energy: EnergyUsage;
  system: SystemStatus;
}> {
  const [weather, crypto, calendar, energy, system] = await Promise.all([
    getWeatherInfo(),
    getCryptoStatus(),
    getCalendarEvents({ days_ahead: 7 }),
    getCurrentEnergyUsage(),
    getSystemStatus()
  ]);

  return {
    weather: weather.data,
    crypto: crypto.data,
    calendar: calendar.data,
    energy: energy.data,
    system: system.data
  };
}

export async function setComfortTemperature(params: {
  entity_id: string;
  season?: 'winter' | 'summer';
}): Promise<ApiResponse> {
  const defaultTemps = {
    winter: 21, // 70°F
    summer: 24  // 75°F
  };
  
  const temperature = params.season ? defaultTemps[params.season] : 22;
  
  return setThermostatTemperature({
    entity_id: params.entity_id,
    temperature,
    hvac_mode: 'auto'
  });
}

export async function secureHome(): Promise<{
  alarm: ApiResponse;
  lights: ApiResponse[];
  locks: ApiResponse[];
}> {
  // This would typically get the relevant entities first, then control them
  const alarmEntities = await searchEntities({ query: 'alarm', domain: 'alarm_control_panel' });
  const lightEntities = await searchEntities({ query: 'light', domain: 'light' });
  const lockEntities = await searchEntities({ query: 'lock', domain: 'lock' });

  const alarmResult = alarmEntities.data.length > 0 
    ? await armAlarm({ entity_id: alarmEntities.data[0].entity_id, mode: 'away' })
    : { success: false, message: 'No alarm system found' };

  const lightResults = await Promise.all(
    lightEntities.data.map(light => 
      controlDevice({ entity_id: light.entity_id, state: 'off' })
    )
  );

  const lockResults = await Promise.all(
    lockEntities.data.map(lock => 
      controlDevice({ entity_id: lock.entity_id, state: 'locked' })
    )
  );

  return {
    alarm: alarmResult,
    lights: lightResults,
    locks: lockResults
  };
}

// LLM Function Definitions for AI Assistant Integration
export const llmFunctionDefinitions = {
  setThermostatTemperature: {
    name: 'setThermostatTemperature',
    description: 'Set the target temperature for a thermostat',
    parameters: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'Thermostat entity ID' },
        temperature: { type: 'number', description: 'Target temperature' },
        hvac_mode: { type: 'string', enum: ['heat', 'cool', 'auto', 'off'], description: 'HVAC mode' }
      },
      required: ['entity_id', 'temperature']
    }
  },
  getThermostatStatus: {
    name: 'getThermostatStatus',
    description: 'Get current thermostat status and temperature',
    parameters: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'Optional specific thermostat entity ID' }
      }
    }
  },
  armAlarm: {
    name: 'armAlarm',
    description: 'Arm the security alarm system',
    parameters: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'Alarm entity ID' },
        mode: { type: 'string', enum: ['home', 'away', 'night'], description: 'Alarm mode' },
        code: { type: 'string', description: 'Optional alarm code' }
      },
      required: ['entity_id', 'mode']
    }
  },
  getCurrentEnergyUsage: {
    name: 'getCurrentEnergyUsage',
    description: 'Get current energy consumption and costs',
    parameters: { type: 'object', properties: {} }
  },
  searchEntities: {
    name: 'searchEntities',
    description: 'Search for Home Assistant entities/devices',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for device names' },
        domain: { type: 'string', description: 'Optional domain filter (light, switch, etc.)' },
        device_class: { type: 'string', description: 'Optional device class filter' }
      },
      required: ['query']
    }
  },
  controlDevice: {
    name: 'controlDevice',
    description: 'Control any Home Assistant device',
    parameters: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'Device entity ID' },
        state: { type: ['string', 'number', 'boolean'], description: 'New state for the device' },
        attributes: { type: 'object', description: 'Optional additional attributes' }
      },
      required: ['entity_id', 'state']
    }
  },
  getWeatherInfo: {
    name: 'getWeatherInfo',
    description: 'Get current weather information and forecast',
    parameters: { type: 'object', properties: {} }
  }
};