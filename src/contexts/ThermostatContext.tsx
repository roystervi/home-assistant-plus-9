// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: src/contexts/ThermostatContext.tsx

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useHomeAssistant } from '@/contexts/HomeAssistantContext';

interface ThermostatData {
  entity_id: string;
  name: string;
  current_temp: number;
  target_temp: number;
  humidity: number;
  mode: 'auto' | 'heat' | 'cool' | 'off';
  hvac_action: 'idle' | 'heating' | 'cooling' | 'off';
  min_temp: number;
  max_temp: number;
  last_updated: string;
}

interface ThermostatContextType {
  thermostats: ThermostatData[];
  updateTargetTemp: (entityId: string, newTemp: number) => Promise<void>;
  updateMode: (entityId: string, newMode: ThermostatData['mode']) => Promise<void>;
  getThermostat: (entityId: string) => ThermostatData | undefined;
  isLoading: boolean;
  error: string | null;
}

const ThermostatContext = createContext<ThermostatContextType | undefined>(undefined);

export function useThermostat() {
  const context = useContext(ThermostatContext);
  if (context === undefined) {
    throw new Error('useThermostat must be used within a ThermostatProvider');
  }
  return context;
}

interface ThermostatProviderProps {
  children: React.ReactNode;
}

export function ThermostatProvider({ children }: ThermostatProviderProps) {
  const { entities, callService, isConnected } = useHomeAssistant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract specific thermostats from Home Assistant entities
  const thermostats = useMemo<ThermostatData[]>(() => {
    if (!entities || Object.keys(entities).length === 0) {
      return [];
    }

    // Target specific thermostat entities
    const targetThermostats = [
      'climate.bobby',
      'climate.bobby_bath_floor'
    ];

    const foundThermostats: ThermostatData[] = [];

    targetThermostats.forEach(entityId => {
      const entity = entities[entityId];
      if (entity) {
        const attributes = entity.attributes || {};
        
        // Map entity names to friendly names
        let name = attributes.friendly_name;
        if (!name) {
          if (entityId === 'climate.bobby') {
            name = 'Main Thermostat';
          } else if (entityId === 'climate.bobby_bath_floor') {
            name = 'Master Bath Floor';
          } else {
            name = entityId.replace('climate.', '').replace(/_/g, ' ');
          }
        }
        
        foundThermostats.push({
          entity_id: entity.entity_id,
          name: name,
          current_temp: Math.round(parseFloat(attributes.current_temperature) || 72),
          target_temp: Math.round(parseFloat(attributes.temperature) || 75),
          humidity: Math.round(parseFloat(attributes.current_humidity) || 0), // Handle missing humidity
          mode: (entity.state as ThermostatData['mode']) || 'auto',
          hvac_action: (attributes.hvac_action as ThermostatData['hvac_action']) || 'idle',
          min_temp: Math.round(parseFloat(attributes.min_temp) || 45),
          max_temp: Math.round(parseFloat(attributes.max_temp) || 90),
          last_updated: entity.last_updated || new Date().toISOString(),
        });
      }
    });

    return foundThermostats;
  }, [entities]);

  // Update connection error state and validate entities
  useEffect(() => {
    if (!isConnected) {
      setError('Not connected to Home Assistant');
    } else if (entities && Object.keys(entities).length > 0) {
      // Check if our target entities exist
      const hasClimateEntities = entities['climate.bobby'] || entities['climate.bobby_bath_floor'];
      if (!hasClimateEntities) {
        setError('Target thermostat entities (climate.bobby, climate.bobby_bath_floor) not found in Home Assistant');
      } else {
        setError(null);
      }
    } else {
      setError('Loading entities from Home Assistant...');
    }
  }, [isConnected, entities]);

  const updateTargetTemp = useCallback(async (entityId: string, newTemp: number) => {
    if (!isConnected) {
      toast.error('Not connected to Home Assistant');
      return;
    }

    const thermostat = thermostats.find(t => t.entity_id === entityId);
    if (!thermostat) {
      toast.error('Thermostat not found');
      return;
    }

    // Round the new temperature to whole number
    const roundedTemp = Math.round(newTemp);

    // Validate temperature range
    if (roundedTemp < thermostat.min_temp || roundedTemp > thermostat.max_temp) {
      toast.error(`Temperature must be between ${thermostat.min_temp}° and ${thermostat.max_temp}°`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call Home Assistant service to set temperature
      await callService('climate', 'set_temperature', {
        temperature: roundedTemp
      }, {
        entity_id: entityId
      });

      toast.success(`${thermostat.name} temperature set to ${roundedTemp}°F`, {
        icon: roundedTemp > 75 ? '🔥' : '❄️'
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update temperature';
      setError(errorMessage);
      toast.error('Failed to update temperature');
      console.error('Temperature update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [thermostats, isConnected, callService]);

  const updateMode = useCallback(async (entityId: string, newMode: ThermostatData['mode']) => {
    if (!isConnected) {
      toast.error('Not connected to Home Assistant');
      return;
    }

    const thermostat = thermostats.find(t => t.entity_id === entityId);
    if (!thermostat) {
      toast.error('Thermostat not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call Home Assistant service to set HVAC mode
      await callService('climate', 'set_hvac_mode', {
        hvac_mode: newMode
      }, {
        entity_id: entityId
      });

      toast.success(`${thermostat.name} mode set to ${newMode.toUpperCase()}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update mode';
      setError(errorMessage);
      toast.error('Failed to update mode');
      console.error('Mode update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [thermostats, isConnected, callService]);

  const getThermostat = useCallback((entityId: string) => {
    return thermostats.find(t => t.entity_id === entityId);
  }, [thermostats]);

  const value: ThermostatContextType = {
    thermostats,
    updateTargetTemp,
    updateMode,
    getThermostat,
    isLoading,
    error
  };

  return (
    <ThermostatContext.Provider value={value}>
      {children}
    </ThermostatContext.Provider>
  );
}