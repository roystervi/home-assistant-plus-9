// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: src/lib/entity-config.ts

import { storage } from './storage';

export interface ThermostatConfig {
  entityId: string;
  name: string;
  enabled: boolean;
}

export interface CryptoConfig {
  entityId: string;
  name: string;
  symbol: string;
  color: string;
  enabled: boolean;
}

export interface SensorConfig {
  entityId: string;
  name: string;
  type: 'door' | 'window' | 'motion';
  enabled: boolean;
}

export interface EntityConfiguration {
  thermostats: ThermostatConfig[];
  cryptoAssets: CryptoConfig[];
  sensors: SensorConfig[];
  energyEntity?: string;
  weatherEntity?: string;
}

// Default configuration
export const DEFAULT_ENTITY_CONFIG: EntityConfiguration = {
  thermostats: [
    {
      entityId: 'climate.bobby',
      name: 'Main Thermostat',
      enabled: true
    },
    {
      entityId: 'climate.bobby_bath_floor',
      name: 'Master Bath Floor',
      enabled: true
    }
  ],
  cryptoAssets: [
    { entityId: "sensor.jasmy", name: "JasmyCoin", symbol: "JASMY", color: "bg-green-500", enabled: true },
    { entityId: "sensor.shiba_inu", name: "Shiba Inu", symbol: "SHIB", color: "bg-orange-500", enabled: true },
    { entityId: "sensor.doge", name: "Dogecoin", symbol: "DOGE", color: "bg-yellow-500", enabled: true },
    { entityId: "sensor.cronos", name: "Cronos", symbol: "CRO", color: "bg-blue-500", enabled: true },
    { entityId: "sensor.algorand", name: "Algorand", symbol: "ALGO", color: "bg-purple-500", enabled: true },
    { entityId: "sensor.dogelon_mars", name: "Dogelon Mars", symbol: "ELON", color: "bg-red-500", enabled: true },
    { entityId: "sensor.xrp", name: "XRP", symbol: "XRP", color: "bg-indigo-500", enabled: true },
    { entityId: "sensor.spell", name: "Spell Token", symbol: "SPELL", color: "bg-pink-500", enabled: true }
  ],
  sensors: [
    // Door sensors
    { entityId: "binary_sensor.front_door", name: "Front Door", type: 'door', enabled: true },
    { entityId: "binary_sensor.back_door", name: "Back Door", type: 'door', enabled: true },
    { entityId: "binary_sensor.garage_door", name: "Garage Door", type: 'door', enabled: true },
    
    // Window sensors
    { entityId: "binary_sensor.living_room_window", name: "Living Room", type: 'window', enabled: true },
    { entityId: "binary_sensor.kitchen_window", name: "Kitchen", type: 'window', enabled: true },
    { entityId: "binary_sensor.bedroom_window", name: "Bedroom", type: 'window', enabled: true },
    
    // Motion sensors
    { entityId: "binary_sensor.living_room_motion", name: "Living Room", type: 'motion', enabled: true },
    { entityId: "binary_sensor.kitchen_motion", name: "Kitchen", type: 'motion', enabled: true },
    { entityId: "binary_sensor.bedroom_motion", name: "Bedroom", type: 'motion', enabled: true }
  ],
  energyEntity: 'sensor.energy_usage',
  weatherEntity: 'weather.home'
};

// Configuration management using existing storage system
class EntityConfigManager {
  private static readonly STORAGE_KEY = 'entity_configuration';

  getConfig(): EntityConfiguration {
    const stored = storage.general.get<EntityConfiguration>(EntityConfigManager.STORAGE_KEY);
    
    if (!stored) {
      // Save defaults on first access
      this.setConfig(DEFAULT_ENTITY_CONFIG);
      return DEFAULT_ENTITY_CONFIG;
    }

    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_ENTITY_CONFIG,
      ...stored,
      thermostats: stored.thermostats || DEFAULT_ENTITY_CONFIG.thermostats,
      cryptoAssets: stored.cryptoAssets || DEFAULT_ENTITY_CONFIG.cryptoAssets,
      sensors: stored.sensors || DEFAULT_ENTITY_CONFIG.sensors
    };
  }

  setConfig(config: EntityConfiguration): boolean {
    return storage.general.set(EntityConfigManager.STORAGE_KEY, config);
  }

  updateConfig(newConfig: Partial<EntityConfiguration>): boolean {
    const currentConfig = this.getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    return this.setConfig(updatedConfig);
  }

  updateThermostat(entityId: string, updates: Partial<ThermostatConfig>): boolean {
    const config = this.getConfig();
    const index = config.thermostats.findIndex(t => t.entityId === entityId);
    
    if (index !== -1) {
      config.thermostats[index] = { ...config.thermostats[index], ...updates };
      return this.setConfig(config);
    }
    return false;
  }

  updateCryptoAsset(entityId: string, updates: Partial<CryptoConfig>): boolean {
    const config = this.getConfig();
    const index = config.cryptoAssets.findIndex(c => c.entityId === entityId);
    
    if (index !== -1) {
      config.cryptoAssets[index] = { ...config.cryptoAssets[index], ...updates };
      return this.setConfig(config);
    }
    return false;
  }

  updateSensor(entityId: string, updates: Partial<SensorConfig>): boolean {
    const config = this.getConfig();
    const index = config.sensors.findIndex(s => s.entityId === entityId);
    
    if (index !== -1) {
      config.sensors[index] = { ...config.sensors[index], ...updates };
      return this.setConfig(config);
    }
    return false;
  }

  addThermostat(thermostat: ThermostatConfig): boolean {
    const config = this.getConfig();
    config.thermostats.push(thermostat);
    return this.setConfig(config);
  }

  addCryptoAsset(crypto: CryptoConfig): boolean {
    const config = this.getConfig();
    config.cryptoAssets.push(crypto);
    return this.setConfig(config);
  }

  addSensor(sensor: SensorConfig): boolean {
    const config = this.getConfig();
    config.sensors.push(sensor);
    return this.setConfig(config);
  }

  removeThermostat(entityId: string): boolean {
    const config = this.getConfig();
    config.thermostats = config.thermostats.filter(t => t.entityId !== entityId);
    return this.setConfig(config);
  }

  removeCryptoAsset(entityId: string): boolean {
    const config = this.getConfig();
    config.cryptoAssets = config.cryptoAssets.filter(c => c.entityId !== entityId);
    return this.setConfig(config);
  }

  removeSensor(entityId: string): boolean {
    const config = this.getConfig();
    config.sensors = config.sensors.filter(s => s.entityId !== entityId);
    return this.setConfig(config);
  }

  resetToDefaults(): boolean {
    return this.setConfig({ ...DEFAULT_ENTITY_CONFIG });
  }

  // Helper methods for getting enabled entities
  getEnabledThermostats(): ThermostatConfig[] {
    return this.getConfig().thermostats.filter(t => t.enabled);
  }

  getEnabledCryptoAssets(): CryptoConfig[] {
    return this.getConfig().cryptoAssets.filter(c => c.enabled);
  }

  getEnabledSensors(type?: 'door' | 'window' | 'motion'): SensorConfig[] {
    const enabled = this.getConfig().sensors.filter(s => s.enabled);
    return type ? enabled.filter(s => s.type === type) : enabled;
  }

  // Bulk operations
  bulkUpdateThermostats(updates: Array<{ entityId: string; updates: Partial<ThermostatConfig> }>): boolean {
    const config = this.getConfig();
    let hasChanges = false;

    updates.forEach(({ entityId, updates: thermostatUpdates }) => {
      const index = config.thermostats.findIndex(t => t.entityId === entityId);
      if (index !== -1) {
        config.thermostats[index] = { ...config.thermostats[index], ...thermostatUpdates };
        hasChanges = true;
      }
    });

    return hasChanges ? this.setConfig(config) : true;
  }

  bulkUpdateCryptoAssets(updates: Array<{ entityId: string; updates: Partial<CryptoConfig> }>): boolean {
    const config = this.getConfig();
    let hasChanges = false;

    updates.forEach(({ entityId, updates: cryptoUpdates }) => {
      const index = config.cryptoAssets.findIndex(c => c.entityId === entityId);
      if (index !== -1) {
        config.cryptoAssets[index] = { ...config.cryptoAssets[index], ...cryptoUpdates };
        hasChanges = true;
      }
    });

    return hasChanges ? this.setConfig(config) : true;
  }

  bulkUpdateSensors(updates: Array<{ entityId: string; updates: Partial<SensorConfig> }>): boolean {
    const config = this.getConfig();
    let hasChanges = false;

    updates.forEach(({ entityId, updates: sensorUpdates }) => {
      const index = config.sensors.findIndex(s => s.entityId === entityId);
      if (index !== -1) {
        config.sensors[index] = { ...config.sensors[index], ...sensorUpdates };
        hasChanges = true;
      }
    });

    return hasChanges ? this.setConfig(config) : true;
  }

  // Export/Import functionality
  exportConfig(): string {
    const config = this.getConfig();
    return JSON.stringify({
      ...config,
      exportTimestamp: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  importConfig(jsonString: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(jsonString);
      
      // Validate imported data
      if (!imported.thermostats || !imported.cryptoAssets || !imported.sensors) {
        return { success: false, error: 'Invalid configuration format' };
      }

      // Remove metadata fields
      const { exportTimestamp, version, ...config } = imported;
      
      // Merge with defaults to ensure completeness
      const mergedConfig = {
        ...DEFAULT_ENTITY_CONFIG,
        ...config
      };

      const success = this.setConfig(mergedConfig);
      return { success, error: success ? undefined : 'Failed to save configuration' };
    } catch (error) {
      return { success: false, error: 'Invalid JSON format' };
    }
  }

  // Validation methods
  validateThermostatConfig(config: ThermostatConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.entityId || !config.entityId.startsWith('climate.')) {
      errors.push('Entity ID must start with "climate."');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Enabled must be a boolean');
    }

    return { valid: errors.length === 0, errors };
  }

  validateCryptoConfig(config: CryptoConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.entityId || !config.entityId.startsWith('sensor.')) {
      errors.push('Entity ID must start with "sensor."');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push('Symbol is required');
    }

    if (!config.color || !config.color.startsWith('bg-')) {
      errors.push('Color must be a valid Tailwind CSS background class');
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Enabled must be a boolean');
    }

    return { valid: errors.length === 0, errors };
  }

  validateSensorConfig(config: SensorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.entityId || !config.entityId.startsWith('binary_sensor.')) {
      errors.push('Entity ID must start with "binary_sensor."');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!['door', 'window', 'motion'].includes(config.type)) {
      errors.push('Type must be door, window, or motion');
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Enabled must be a boolean');
    }

    return { valid: errors.length === 0, errors };
  }
}

// Singleton instance
export const entityConfig = new EntityConfigManager();