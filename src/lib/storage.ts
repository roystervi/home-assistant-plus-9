// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
//
// File: lib/storage.ts - Persistent storage utilities for Home Assistant settings
// Affected files: components/pages/Settings.tsx, components/pages/EnergyMonitor.tsx, components/pages/Dashboard.tsx
// Purpose: Provide localStorage-based persistence for all application settings

// Task Breakdown:
// 1. Define TypeScript interfaces for all settings categories
// 2. Create individual storage managers for each category
// 3. Implement general storage utilities with error handling
// 4. Provide default values and type safety
// 5. Support both individual and bulk operations

// Home Assistant Connection Settings Interface
export interface HAConnectionSettings {
  url: string;
  token: string;
  connectionTimeout: number;
  isConnected: boolean;
  lastConnectionTest: string;
}

// Weather API Settings Interface
export interface WeatherApiSettings {
  provider: "openweathermap" | "weatherapi" | "accuweather" | "ha_integration";
  apiKey: string;
  location: {
    lat: number;
    lon: number;
    city: string;
    country: string;
  };
  units: "imperial" | "metric";
  isConfigured: boolean;
  lastUpdate: string;
}

// Energy API Settings Interface
export interface EnergyApiSettings {
  provider: "ha" | "utility_api" | "sense" | "manual";
  costPerKwh: number;
  timezone: string;
  utilityApiKey: string;
  senseEmail: string;
  sensePassword: string;
  isConfigured: boolean;
}

// Appearance Settings Interface
export interface AppearanceSettings {
  theme: "light" | "dark" | "auto";
  backgroundColor: string;
  textSize: number;
  textWeight: "normal" | "bold";
  textColor: string;
  displayMode: "tv" | "desktop" | "tablet" | "phone";
}

// Default Settings
const DEFAULT_HA_CONNECTION: HAConnectionSettings = {
  url: "",
  token: "",
  connectionTimeout: 5000,
  isConnected: false,
  lastConnectionTest: "",
};

const DEFAULT_WEATHER_API: WeatherApiSettings = {
  provider: "ha_integration",
  apiKey: "",
  location: {
    lat: 0,
    lon: 0,
    city: "",
    country: "",
  },
  units: "metric",
  isConfigured: false,
  lastUpdate: "",
};

const DEFAULT_ENERGY_API: EnergyApiSettings = {
  provider: "ha",
  costPerKwh: 0.12,
  timezone: "UTC",
  utilityApiKey: "",
  senseEmail: "",
  sensePassword: "",
  isConfigured: false,
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "auto",
  backgroundColor: "#f3f4f6",
  textSize: 16,
  textWeight: "normal",
  textColor: "#111827",
  displayMode: "desktop",
};

// General Storage Utility Class
class StorageManager<T> {
  private key: string;
  private defaultValue: T;

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  // Get all settings
  get(): T {
    try {
      if (typeof window === "undefined") return this.defaultValue;
      
      const stored = localStorage.getItem(this.key);
      if (!stored) return this.defaultValue;
      
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return { ...this.defaultValue, ...parsed };
    } catch (error) {
      console.error(`Error reading from localStorage (${this.key}):`, error);
      return this.defaultValue;
    }
  }

  // Set all settings
  set(value: T): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${this.key}):`, error);
      return false;
    }
  }

  // Get a specific setting
  getSetting<K extends keyof T>(key: K): T[K] {
    const settings = this.get();
    return settings[key];
  }

  // Set a specific setting
  setSetting<K extends keyof T>(key: K, value: T[K]): boolean {
    try {
      const settings = this.get();
      settings[key] = value;
      return this.set(settings);
    } catch (error) {
      console.error(`Error setting ${String(key)} in ${this.key}:`, error);
      return false;
    }
  }

  // Update multiple settings at once
  updateSettings(updates: Partial<T>): boolean {
    try {
      const settings = this.get();
      const updatedSettings = { ...settings, ...updates };
      return this.set(updatedSettings);
    } catch (error) {
      console.error(`Error updating settings in ${this.key}:`, error);
      return false;
    }
  }

  // Reset to default values
  reset(): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      localStorage.removeItem(this.key);
      return true;
    } catch (error) {
      console.error(`Error resetting ${this.key}:`, error);
      return false;
    }
  }

  // Check if storage is available
  isAvailable(): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      const testKey = `${this.key}_test`;
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// Storage Managers for each category
export const haConnectionSettings = new StorageManager<HAConnectionSettings>(
  "ha_connection_settings",
  DEFAULT_HA_CONNECTION
);

export const weatherApiSettings = new StorageManager<WeatherApiSettings>(
  "weather_api_settings",
  DEFAULT_WEATHER_API
);

export const energyApiSettings = new StorageManager<EnergyApiSettings>(
  "energy_api_settings",
  DEFAULT_ENERGY_API
);

export const appearanceSettings = new StorageManager<AppearanceSettings>(
  "appearance_settings",
  DEFAULT_APPEARANCE
);

// General Storage Utilities
export class GeneralStorage {
  // Store any value with a key
  static set<T>(key: string, value: T): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      return false;
    }
  }

  // Retrieve any value by key
  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      if (typeof window === "undefined") return defaultValue || null;
      
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue || null;
      
      return JSON.parse(stored);
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return defaultValue || null;
    }
  }

  // Remove a value by key
  static remove(key: string): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  }

  // Clear all storage
  static clear(): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  }

  // Get all keys with a prefix
  static getKeysWithPrefix(prefix: string): string[] {
    try {
      if (typeof window === "undefined") return [];
      
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error("Error getting keys with prefix:", error);
      return [];
    }
  }

  // Check if localStorage is available
  static isAvailable(): boolean {
    try {
      if (typeof window === "undefined") return false;
      
      const testKey = "storage_test";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // Get storage usage info
  static getStorageInfo(): { used: number; total: number; available: number } {
    try {
      if (typeof window === "undefined") {
        return { used: 0, total: 0, available: 0 };
      }

      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Most browsers allow 5-10MB for localStorage
      const total = 10 * 1024 * 1024; // 10MB estimate
      const available = total - used;

      return { used, total, available };
    } catch (error) {
      console.error("Error getting storage info:", error);
      return { used: 0, total: 0, available: 0 };
    }
  }
}

// Export default values for external use
export const defaults = {
  haConnection: DEFAULT_HA_CONNECTION,
  weatherApi: DEFAULT_WEATHER_API,
  energyApi: DEFAULT_ENERGY_API,
  appearance: DEFAULT_APPEARANCE,
};

// Convenience functions for quick access
export const storage = {
  // Home Assistant settings
  ha: haConnectionSettings,
  
  // Weather API settings
  weather: weatherApiSettings,
  
  // Energy API settings
  energy: energyApiSettings,
  
  // Appearance settings
  appearance: appearanceSettings,
  
  // General storage
  general: GeneralStorage,
  
  // Check if all storage is available
  isAvailable: () => GeneralStorage.isAvailable(),
  
  // Reset all settings
  resetAll: () => {
    return (
      haConnectionSettings.reset() &&
      weatherApiSettings.reset() &&
      energyApiSettings.reset() &&
      appearanceSettings.reset()
    );
  },
  
  // Export all settings
  exportAll: () => {
    return {
      haConnection: haConnectionSettings.get(),
      weatherApi: weatherApiSettings.get(),
      energyApi: energyApiSettings.get(),
      appearance: appearanceSettings.get(),
      timestamp: new Date().toISOString(),
    };
  },
  
  // Import all settings
  importAll: (data: any) => {
    try {
      let success = true;
      
      if (data.haConnection) {
        success = haConnectionSettings.set(data.haConnection) && success;
      }
      
      if (data.weatherApi) {
        success = weatherApiSettings.set(data.weatherApi) && success;
      }
      
      if (data.energyApi) {
        success = energyApiSettings.set(data.energyApi) && success;
      }
      
      if (data.appearance) {
        success = appearanceSettings.set(data.appearance) && success;
      }
      
      return success;
    } catch (error) {
      console.error("Error importing settings:", error);
      return false;
    }
  },
};

// Export everything for easy importing
export default storage;