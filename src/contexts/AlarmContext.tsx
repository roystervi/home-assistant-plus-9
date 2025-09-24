// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: src/contexts/AlarmContext.tsx

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { entityConfig, type SensorConfig } from '@/lib/entity-config';
import { DashboardError } from '@/types/dashboard';

interface SensorData {
  entity_id: string;
  name: string;
  state: 'on' | 'off';
  last_changed: string;
  type: 'door' | 'window' | 'motion';
  available: boolean;
  battery_level?: number;
}

interface AlarmSystemData {
  state: 'disarmed' | 'armed-home' | 'armed-away' | 'pending' | 'alarm' | 'error';
  code_arm_required: boolean;
  last_changed: string;
  next_delay: number;
  attributes: {
    friendly_name: string;
    supported_features: number;
    code_format: string;
  };
}

interface AlarmContextType {
  alarmSystem: AlarmSystemData;
  sensors: SensorData[];
  pinCode: string;
  errorMessage: string;
  isLoading: boolean;
  lastError: DashboardError | null;
  setPinCode: (code: string) => void;
  clearPin: () => void;
  submitPin: () => Promise<void>;
  armHome: () => Promise<void>;
  armAway: () => Promise<void>;
  disarm: () => Promise<void>;
  panic: () => Promise<void>;
  getSensorsByType: (type: 'door' | 'window' | 'motion') => SensorData[];
  getAvailableSensors: () => SensorData[];
  getSensorConfig: () => SensorConfig[];
  updateSensorConfig: (config: SensorConfig[]) => void;
  refreshSensors: () => void;
  isConnected: boolean;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export function useAlarm() {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}

interface AlarmProviderProps {
  children: React.ReactNode;
}

export function AlarmProvider({ children }: AlarmProviderProps) {
  const [alarmSystem, setAlarmSystem] = useState<AlarmSystemData>({
    state: 'disarmed',
    code_arm_required: true,
    last_changed: new Date().toISOString(),
    next_delay: 0,
    attributes: {
      friendly_name: "Home Security System",
      supported_features: 15,
      code_format: "number"
    }
  });

  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [sensorConfigs, setSensorConfigs] = useState<SensorConfig[]>([]);
  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<DashboardError | null>(null);
  const [isConnected] = useState(true); // Simulate connection status

  // Load sensor configuration
  useEffect(() => {
    const config = entityConfig.getConfig();
    setSensorConfigs(config.sensors);
  }, []);

  // Helper function to create error objects
  const createError = useCallback((code: string, message: string, context?: Record<string, any>): DashboardError => {
    return {
      code,
      message,
      timestamp: new Date().toISOString(),
      context,
      recoverable: true
    };
  }, []);

  // Initialize sensors from configuration
  useEffect(() => {
    const enabledSensors = sensorConfigs.filter(config => config.enabled);
    
    const initialSensors: SensorData[] = enabledSensors.map(config => ({
      entity_id: config.entityId,
      name: config.name,
      state: 'off',
      last_changed: new Date().toISOString(),
      type: config.type,
      available: true,
      battery_level: Math.floor(Math.random() * 20) + 80 // Random battery level between 80-100%
    }));

    setSensors(initialSensors);
  }, [sensorConfigs]);

  // Simulate sensor state changes with better error handling
  useEffect(() => {
    if (sensors.length === 0) return;

    const interval = setInterval(() => {
      // Randomly trigger sensor changes (very rarely)
      if (Math.random() < 0.02) { // 2% chance every 30 seconds
        setSensors(prev => prev.map(sensor => {
          if (Math.random() < 0.1) { // 10% chance for each sensor
            const newState = sensor.state === 'on' ? 'off' : 'on';
            
            // Simulate occasional sensor unavailability
            const available = Math.random() > 0.01; // 99% availability
            
            return {
              ...sensor,
              state: available ? newState : sensor.state,
              last_changed: new Date().toISOString(),
              available: available,
              battery_level: available ? sensor.battery_level : undefined
            };
          }
          return sensor;
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [sensors.length]);

  const clearPin = useCallback(() => {
    setPinCode("");
    setErrorMessage("");
    setLastError(null);
  }, []);

  const submitPin = useCallback(async () => {
    if (pinCode.length === 0) return;
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (pinCode === "1234" || pinCode === "0000") {
        toast.success("Valid PIN entered");
        setPinCode("");
        setErrorMessage("");
      } else {
        const error = createError(
          'INVALID_PIN',
          'Invalid PIN code entered',
          { pinLength: pinCode.length, attempts: 1 }
        );
        setLastError(error);
        setErrorMessage("INVALID CODE");
        toast.error("Invalid PIN code");
      }
    } catch (error) {
      const systemError = createError(
        'SYSTEM_ERROR',
        'System error occurred during PIN validation',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      setLastError(systemError);
      setErrorMessage("SYSTEM ERROR");
      toast.error("System error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pinCode, createError]);

  const armHome = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      // Check if any doors/windows are open
      const openDoors = sensors.filter(s => s.type === 'door' && s.state === 'on' && s.available);
      const openWindows = sensors.filter(s => s.type === 'window' && s.state === 'on' && s.available);
      
      if (openDoors.length > 0 || openWindows.length > 0) {
        const openItems = [...openDoors, ...openWindows].map(s => s.name).join(', ');
        const securityError = createError(
          'OPEN_DOORS_WINDOWS',
          'Cannot arm system with open doors or windows',
          { openDoors: openDoors.map(d => d.entity_id), openWindows: openWindows.map(w => w.entity_id) }
        );
        setLastError(securityError);
        setErrorMessage("SECURE DOORS/WINDOWS");
        toast.error(`Cannot arm: ${openItems} open`);
        setIsLoading(false);
        return;
      }

      // Check for unavailable sensors
      const unavailableSensors = sensors.filter(s => !s.available);
      if (unavailableSensors.length > 0) {
        const sensorError = createError(
          'SENSORS_UNAVAILABLE',
          'Some sensors are unavailable',
          { unavailableSensors: unavailableSensors.map(s => s.entity_id) }
        );
        setLastError(sensorError);
        toast.warning(`Warning: ${unavailableSensors.length} sensors unavailable`);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAlarmSystem(prev => ({ 
        ...prev, 
        state: 'armed-home',
        last_changed: new Date().toISOString()
      }));
      
      toast.success("System armed in HOME mode");
      setPinCode("");
      setErrorMessage("");
    } catch (error) {
      const armError = createError(
        'ARM_FAILED',
        'Failed to arm system in HOME mode',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      setLastError(armError);
      setErrorMessage("COMMAND FAILED");
      toast.error("Failed to arm system");
    } finally {
      setIsLoading(false);
    }
  }, [sensors, createError]);

  const armAway = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      // Check if any doors/windows are open
      const openDoors = sensors.filter(s => s.type === 'door' && s.state === 'on' && s.available);
      const openWindows = sensors.filter(s => s.type === 'window' && s.state === 'on' && s.available);
      
      if (openDoors.length > 0 || openWindows.length > 0) {
        const openItems = [...openDoors, ...openWindows].map(s => s.name).join(', ');
        const securityError = createError(
          'OPEN_DOORS_WINDOWS',
          'Cannot arm system with open doors or windows',
          { openDoors: openDoors.map(d => d.entity_id), openWindows: openWindows.map(w => w.entity_id) }
        );
        setLastError(securityError);
        setErrorMessage("SECURE DOORS/WINDOWS");
        toast.error(`Cannot arm: ${openItems} open`);
        setIsLoading(false);
        return;
      }

      // Check for unavailable sensors
      const unavailableSensors = sensors.filter(s => !s.available);
      if (unavailableSensors.length > 0) {
        const sensorError = createError(
          'SENSORS_UNAVAILABLE',
          'Some sensors are unavailable',
          { unavailableSensors: unavailableSensors.map(s => s.entity_id) }
        );
        setLastError(sensorError);
        toast.warning(`Warning: ${unavailableSensors.length} sensors unavailable`);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAlarmSystem(prev => ({ 
        ...prev, 
        state: 'armed-away',
        last_changed: new Date().toISOString()
      }));
      
      toast.success("System armed in AWAY mode");
      setPinCode("");
      setErrorMessage("");
    } catch (error) {
      const armError = createError(
        'ARM_FAILED',
        'Failed to arm system in AWAY mode',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      setLastError(armError);
      setErrorMessage("COMMAND FAILED");
      toast.error("Failed to arm system");
    } finally {
      setIsLoading(false);
    }
  }, [sensors, createError]);

  const disarm = useCallback(async () => {
    if (pinCode.length === 0) {
      const pinError = createError(
        'NO_PIN_ENTERED',
        'PIN code required to disarm system'
      );
      setLastError(pinError);
      setErrorMessage("ENTER PIN CODE");
      return;
    }
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (pinCode === "1234" || pinCode === "0000") {
        setAlarmSystem(prev => ({ 
          ...prev, 
          state: 'disarmed',
          last_changed: new Date().toISOString()
        }));
        
        toast.success("System disarmed");
        setPinCode("");
        setErrorMessage("");
      } else {
        const invalidPinError = createError(
          'INVALID_PIN',
          'Invalid PIN code for disarming',
          { pinLength: pinCode.length }
        );
        setLastError(invalidPinError);
        setErrorMessage("INVALID CODE");
        toast.error("Invalid PIN code");
      }
    } catch (error) {
      const disarmError = createError(
        'DISARM_FAILED',
        'Failed to disarm system',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      setLastError(disarmError);
      setErrorMessage("COMMAND FAILED");
      toast.error("Failed to disarm system");
    } finally {
      setIsLoading(false);
    }
  }, [pinCode, createError]);

  const panic = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAlarmSystem(prev => ({ 
        ...prev, 
        state: 'alarm',
        last_changed: new Date().toISOString()
      }));
      
      toast.error("PANIC ALARM ACTIVATED!");
      setPinCode("");
      setErrorMessage("");
    } catch (error) {
      const panicError = createError(
        'PANIC_FAILED',
        'Failed to activate panic alarm',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      setLastError(panicError);
      setErrorMessage("PANIC FAILED");
    } finally {
      setIsLoading(false);
    }
  }, [createError]);

  const getSensorsByType = useCallback((type: 'door' | 'window' | 'motion') => {
    return sensors.filter(sensor => sensor.type === type);
  }, [sensors]);

  const getAvailableSensors = useCallback(() => {
    return sensors.filter(sensor => sensor.available);
  }, [sensors]);

  const getSensorConfig = useCallback(() => {
    return sensorConfigs;
  }, [sensorConfigs]);

  const updateSensorConfig = useCallback((config: SensorConfig[]) => {
    setSensorConfigs(config);
    entityConfig.updateConfig({ sensors: config });
  }, []);

  const refreshSensors = useCallback(() => {
    const config = entityConfig.getConfig();
    setSensorConfigs(config.sensors);
  }, []);

  const value: AlarmContextType = {
    alarmSystem,
    sensors,
    pinCode,
    errorMessage,
    isLoading,
    lastError,
    setPinCode,
    clearPin,
    submitPin,
    armHome,
    armAway,
    disarm,
    panic,
    getSensorsByType,
    getAvailableSensors,
    getSensorConfig,
    updateSensorConfig,
    refreshSensors,
    isConnected
  };

  return (
    <AlarmContext.Provider value={value}>
      {children}
    </AlarmContext.Provider>
  );
}