"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

export interface HomeAssistantEntity {
  entity_id: string;
  state: string | number;
  friendly_name: string;
  unit_of_measurement?: string;
  device_class?: string;
  last_changed: string;
  last_updated: string;
  attributes: Record<string, any>;
}

export interface EnergyData {
  entity_id: string;
  name: string;
  state: number;
  unit: string;
  lastUpdated: string;
}

export interface UseHomeAssistantReturn {
  connectionStatus: ConnectionStatus;
  entities: Record<string, HomeAssistantEntity>;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  syncingData: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isEntityAvailable: (entityId: string) => boolean;
  getEntity: (entityId: string) => HomeAssistantEntity | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  syncData: () => Promise<void>;
  reconnect: () => Promise<void>;
  fetchEntities: () => Promise<void>;
  getMainEnergyData: () => EnergyData[];
  getDeviceEnergyData: () => EnergyData[];
  getTotalConsumption: () => number;
}

// Mock data generators
const generateMockEnergyData = () => {
  const baseTime = new Date();
  const entities: Record<string, HomeAssistantEntity> = {};

  // Energy sensors with realistic values
  const energySensors = [
    { id: 'sensor.bobby_s_energy_this_month', name: "Bobby's Energy This Month", monthlyBase: 450, unit: 'kWh' },
    { id: 'sensor.bobby_s_energy_today', name: "Bobby's Energy Today", dailyBase: 15, unit: 'kWh' },
    { id: 'sensor.bobby_s_power_minute_average', name: "Bobby's Power (1min avg)", powerBase: 2500, unit: 'W' },
    { id: 'sensor.air_handler_energy_this_month', name: 'Air Handler Energy This Month', monthlyBase: 120, unit: 'kWh' },
    { id: 'sensor.den_garage_energy_this_month', name: 'Den/Garage Energy This Month', monthlyBase: 85, unit: 'kWh' },
    { id: 'sensor.fridge_energy_this_month', name: 'Fridge Energy This Month', monthlyBase: 65, unit: 'kWh' },
    { id: 'sensor.heat_pump_energy_this_month', name: 'Heat Pump Energy This Month', monthlyBase: 280, unit: 'kWh' }
  ];

  energySensors.forEach(sensor => {
    let state: number;
    if (sensor.unit === 'W') {
      // Power sensors - fluctuate around base ±500W
      state = sensor.powerBase! + Math.sin(Date.now() / 60000) * 500 + (Math.random() - 0.5) * 200;
    } else if (sensor.dailyBase) {
      // Daily energy - accumulates throughout day
      const hourOfDay = new Date().getHours();
      state = sensor.dailyBase + (hourOfDay / 24) * 8 + Math.random() * 2;
    } else {
      // Monthly energy - accumulates throughout month
      const dayOfMonth = new Date().getDate();
      state = sensor.monthlyBase! + (dayOfMonth / 31) * 50 + Math.random() * 10;
    }

    entities[sensor.id] = {
      entity_id: sensor.id,
      state: Math.round(state * 100) / 100,
      friendly_name: sensor.name,
      unit_of_measurement: sensor.unit,
      device_class: 'energy',
      last_changed: new Date(baseTime.getTime() - Math.random() * 300000).toISOString(),
      last_updated: new Date(baseTime.getTime() - Math.random() * 60000).toISOString(),
      attributes: {
        device_class: sensor.unit === 'W' ? 'power' : 'energy',
        state_class: 'total_increasing',
        source: 'mock_data'
      }
    };
  });

  return entities;
};

const generateMockCryptoData = () => {
  const baseTime = new Date();
  const entities: Record<string, HomeAssistantEntity> = {};

  const cryptoSensors = [
    { id: 'sensor.jasmy', name: 'JASMY', basePrice: 0.025 },
    { id: 'sensor.shiba_inu', name: 'Shiba Inu', basePrice: 0.00002 },
    { id: 'sensor.doge', name: 'Dogecoin', basePrice: 0.08 },
    { id: 'sensor.cronos', name: 'Cronos', basePrice: 0.12 },
    { id: 'sensor.algorand', name: 'Algorand', basePrice: 0.35 },
    { id: 'sensor.dogelon_mars', name: 'Dogelon Mars', basePrice: 0.0000003 },
    { id: 'sensor.xrp', name: 'XRP', basePrice: 0.62 },
    { id: 'sensor.spell', name: 'Spell Token', basePrice: 0.0008 }
  ];

  cryptoSensors.forEach(crypto => {
    // Simulate price fluctuations
    const volatility = crypto.basePrice * 0.15; // 15% volatility
    const priceChange = Math.sin(Date.now() / 180000) * volatility + (Math.random() - 0.5) * volatility * 0.5;
    const currentPrice = crypto.basePrice + priceChange;

    entities[crypto.id] = {
      entity_id: crypto.id,
      state: Math.max(0, currentPrice),
      friendly_name: crypto.name,
      unit_of_measurement: 'USD',
      device_class: 'monetary',
      last_changed: new Date(baseTime.getTime() - Math.random() * 300000).toISOString(),
      last_updated: new Date(baseTime.getTime() - Math.random() * 60000).toISOString(),
      attributes: {
        device_class: 'monetary',
        state_class: 'measurement',
        source: 'mock_crypto_api',
        market_cap: Math.floor(Math.random() * 1000000000),
        volume_24h: Math.floor(Math.random() * 100000000)
      }
    };
  });

  return entities;
};

const generateMockSecurityData = () => {
  const baseTime = new Date();
  const entities: Record<string, HomeAssistantEntity> = {};

  const binarySensors = [
    { id: 'binary_sensor.front_door', name: 'Front Door', deviceClass: 'door' },
    { id: 'binary_sensor.living_room_window', name: 'Living Room Window', deviceClass: 'window' },
    { id: 'binary_sensor.rear_door', name: 'Rear Door', deviceClass: 'door' }
  ];

  binarySensors.forEach(sensor => {
    // Most sensors should be "off" (closed/secure) most of the time
    const isOpen = Math.random() < 0.1; // 10% chance of being open

    entities[sensor.id] = {
      entity_id: sensor.id,
      state: isOpen ? 'on' : 'off',
      friendly_name: sensor.name,
      device_class: sensor.deviceClass,
      last_changed: new Date(baseTime.getTime() - Math.random() * 7200000).toISOString(),
      last_updated: new Date(baseTime.getTime() - Math.random() * 60000).toISOString(),
      attributes: {
        device_class: sensor.deviceClass,
        source: 'mock_security_system'
      }
    };
  });

  // Alarm control panel
  const alarmStates = ['disarmed', 'armed_home', 'armed_away'];
  const currentAlarmState = alarmStates[Math.floor(Math.random() * alarmStates.length)];

  entities['alarm_control_panel.home_alarm'] = {
    entity_id: 'alarm_control_panel.home_alarm',
    state: currentAlarmState,
    friendly_name: 'Home Alarm',
    device_class: 'alarm',
    last_changed: new Date(baseTime.getTime() - Math.random() * 3600000).toISOString(),
    last_updated: new Date(baseTime.getTime() - Math.random() * 60000).toISOString(),
    attributes: {
      supported_features: 15,
      code_arm_required: false,
      source: 'mock_alarm_system'
    }
  };

  return entities;
};

export const useHomeAssistant = (): UseHomeAssistantReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [entities, setEntities] = useState<Record<string, HomeAssistantEntity>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncingData, setSyncingData] = useState(false);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  // Cache management
  const cacheKey = 'homeassistant_entities';
  const cacheTimestampKey = 'homeassistant_cache_timestamp';

  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = new Date(cacheTimestamp);
        const now = new Date();
        const cacheAge = now.getTime() - timestamp.getTime();
        
        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          setEntities(JSON.parse(cachedData));
          setLastSync(timestamp);
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
    return false;
  }, []);

  const saveToCache = useCallback((data: Record<string, HomeAssistantEntity>) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheTimestampKey, new Date().toISOString());
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }, []);

  const generateMockData = useCallback(() => {
    const energyData = generateMockEnergyData();
    const cryptoData = generateMockCryptoData();
    const securityData = generateMockSecurityData();
    
    return {
      ...energyData,
      ...cryptoData,
      ...securityData
    };
  }, []);

  const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  const fetchEntities = useCallback(async () => {
    setSyncingData(true);
    
    try {
      await simulateNetworkDelay();
      
      // Simulate occasional failures
      if (Math.random() < 0.05) {
        throw new Error('Network timeout');
      }
      
      const mockData = generateMockData();
      setEntities(mockData);
      saveToCache(mockData);
      setLastSync(new Date());
      setError(null);
      retryCountRef.current = 0;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch entities:', err);
      
      // Load from cache on error
      const cacheLoaded = loadFromCache();
      if (!cacheLoaded) {
        toast.error(`Failed to fetch data: ${errorMessage}`);
      }
    } finally {
      setSyncingData(false);
    }
  }, [generateMockData, saveToCache, loadFromCache]);

  const connect = useCallback(async () => {
    if (connectionStatus === "connecting") return;
    
    setConnectionStatus("connecting");
    setLoading(true);
    setError(null);

    try {
      // Load from cache immediately for faster UI
      loadFromCache();
      
      await simulateNetworkDelay();
      
      // Simulate connection failures
      if (Math.random() < 0.1) {
        throw new Error('Connection refused');
      }
      
      setConnectionStatus("connected");
      await fetchEntities();
      
      toast.success("Connected to Home Assistant");
      retryCountRef.current = 0;
      
      // Set up auto-refresh
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      autoRefreshIntervalRef.current = setInterval(() => {
        if (connectionStatus === "connected") {
          fetchEntities();
        }
      }, 30000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setConnectionStatus("error");
      toast.error(`Connection failed: ${errorMessage}`);
      
      // Schedule retry
      retryCountRef.current++;
      if (retryCountRef.current < 5) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          toast.info(`Retrying connection (attempt ${retryCountRef.current + 1}/5)...`);
          connect();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [connectionStatus, fetchEntities, loadFromCache]);

  const disconnect = useCallback(() => {
    setConnectionStatus("disconnected");
    setError(null);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    
    toast.info("Disconnected from Home Assistant");
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  }, [connect, disconnect]);

  const syncData = useCallback(async () => {
    if (connectionStatus !== "connected") {
      toast.error("Not connected to Home Assistant");
      return;
    }
    await fetchEntities();
  }, [connectionStatus, fetchEntities]);

  // Utility functions
  const isEntityAvailable = useCallback((entityId: string) => {
    return entityId in entities;
  }, [entities]);

  const getEntity = useCallback((entityId: string) => {
    return entities[entityId] || null;
  }, [entities]);

  const getMainEnergyData = useCallback((): EnergyData[] => {
    const mainEnergyEntities = [
      'sensor.bobby_s_energy_this_month',
      'sensor.bobby_s_energy_today',
      'sensor.bobby_s_power_minute_average'
    ];

    return mainEnergyEntities
      .map(entityId => {
        const entity = entities[entityId];
        if (!entity) return null;
        
        return {
          entity_id: entityId,
          name: entity.friendly_name,
          state: typeof entity.state === 'number' ? entity.state : parseFloat(entity.state as string) || 0,
          unit: entity.unit_of_measurement || '',
          lastUpdated: entity.last_updated
        };
      })
      .filter((item): item is EnergyData => item !== null);
  }, [entities]);

  const getDeviceEnergyData = useCallback((): EnergyData[] => {
    const deviceEnergyEntities = [
      'sensor.air_handler_energy_this_month',
      'sensor.den_garage_energy_this_month',
      'sensor.fridge_energy_this_month',
      'sensor.heat_pump_energy_this_month'
    ];

    return deviceEnergyEntities
      .map(entityId => {
        const entity = entities[entityId];
        if (!entity) return null;
        
        return {
          entity_id: entityId,
          name: entity.friendly_name,
          state: typeof entity.state === 'number' ? entity.state : parseFloat(entity.state as string) || 0,
          unit: entity.unit_of_measurement || '',
          lastUpdated: entity.last_updated
        };
      })
      .filter((item): item is EnergyData => item !== null);
  }, [entities]);

  const getTotalConsumption = useCallback((): number => {
    const monthlyEntity = entities['sensor.bobby_s_energy_this_month'];
    if (!monthlyEntity) return 0;
    
    return typeof monthlyEntity.state === 'number' 
      ? monthlyEntity.state 
      : parseFloat(monthlyEntity.state as string) || 0;
  }, [entities]);

  // Initialize
  useEffect(() => {
    loadFromCache();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [loadFromCache]);

  return {
    connectionStatus,
    entities,
    loading,
    error,
    lastSync,
    syncingData,
    isConnected: connectionStatus === "connected",
    isLoading: loading,
    isEntityAvailable,
    getEntity,
    connect,
    disconnect,
    syncData,
    reconnect,
    fetchEntities,
    getMainEnergyData,
    getDeviceEnergyData,
    getTotalConsumption
  };
};