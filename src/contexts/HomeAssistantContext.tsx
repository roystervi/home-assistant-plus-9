"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { HomeAssistantAPI, HAEntity, ConnectionStatus } from '@/lib/homeassistant';
import { haConnectionSettings } from '@/lib/storage';

interface HomeAssistantContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  haApi: HomeAssistantAPI | null;
  entities: Record<string, HAEntity>;
  searchEntities: (query: string) => HAEntity[];
  callService: (domain: string, service: string, serviceData?: any, target?: any) => Promise<any>;
  testConnection: (url: string, token: string) => Promise<boolean>;
  updateSettings: (url: string, token: string) => Promise<void>;
  error: string | null;
  retryConnection: () => Promise<void>;
}

const HomeAssistantContext = createContext<HomeAssistantContextType | undefined>(undefined);

interface HomeAssistantProviderProps {
  children: ReactNode;
}

export const HomeAssistantProvider: React.FC<HomeAssistantProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [haApi, setHaApi] = useState<HomeAssistantAPI | null>(null);
  const [entities, setEntities] = useState<Record<string, HAEntity>>({});
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      setReconnectTimeout(null);
    }
  }, [reconnectTimeout]);

  const connectToHomeAssistant = useCallback(async (url: string, token: string, isRetry = false) => {
    if (!isRetry) {
      setRetryCount(0);
    }
    
    setConnectionStatus('connecting');
    setError(null);
    clearReconnectTimeout();

    try {
      // Create new HomeAssistantAPI instance with proper config
      const api = new HomeAssistantAPI({
        url,
        token,
        autoReconnect: true,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      });
      
      // Test the connection
      const isValid = await api.testConnection();
      if (!isValid) {
        throw new Error('Failed to connect to Home Assistant');
      }

      setHaApi(api);
      setIsConnected(true);
      setConnectionStatus('connected');
      setRetryCount(0);

      // Set up event listeners
      api.on('connection_status', (status: ConnectionStatus) => {
        setConnectionStatus(status);
        setIsConnected(status === 'connected');
        if (status === 'error' || status === 'disconnected') {
          setError('Connection lost');
        } else if (status === 'connected') {
          setError(null);
        }
      });

      api.on('state_changed', (data: any) => {
        setEntities(prev => ({
          ...prev,
          [data.entity_id]: data.new_state
        }));
      });

      api.on('states_loaded', (states: Record<string, HAEntity>) => {
        setEntities(states);
      });

      api.on('error', (err: Error) => {
        setError(err.message);
        setConnectionStatus('error');
      });

      // Fetch initial entities
      try {
        const states = await api.getStates();
        const entitiesMap: Record<string, HAEntity> = {};
        states.forEach((entity: HAEntity) => {
          entitiesMap[entity.entity_id] = entity;
        });
        setEntities(entitiesMap);
      } catch (entitiesError) {
        console.warn('Failed to fetch entities:', entitiesError);
      }

    } catch (err) {
      console.error('Home Assistant connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionStatus('error');
      setIsConnected(false);
      setHaApi(null);
      setEntities({});

      // Implement exponential backoff retry
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        const timeout = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          connectToHomeAssistant(url, token, true);
        }, delay);
        setReconnectTimeout(timeout);
      }
    }
  }, [retryCount, clearReconnectTimeout]);

  const searchEntities = useCallback((query: string): HAEntity[] => {
    if (!query.trim()) {
      return Object.values(entities);
    }

    const lowercaseQuery = query.toLowerCase();
    return Object.values(entities).filter(entity => 
      entity.entity_id.toLowerCase().includes(lowercaseQuery) ||
      (entity.attributes.friendly_name && 
       entity.attributes.friendly_name.toLowerCase().includes(lowercaseQuery)) ||
      entity.state.toLowerCase().includes(lowercaseQuery)
    );
  }, [entities]);

  const callService = useCallback(async (domain: string, service: string, serviceData?: any, target?: any): Promise<any> => {
    if (!haApi || !isConnected) {
      throw new Error('Not connected to Home Assistant');
    }

    try {
      // Get HA connection settings for direct API call
      const settings = haConnectionSettings.get();
      if (!settings?.url || !settings?.token) {
        throw new Error('Home Assistant settings not configured');
      }

      // Format the request body correctly for Home Assistant API
      const requestBody: any = {};
      
      // If entity_id is in serviceData, move it to top level or target
      if (serviceData?.entity_id) {
        // For alarm_control_panel services, entity_id goes in top level
        requestBody.entity_id = serviceData.entity_id;
        
        // Remove entity_id from service_data and add other properties
        const { entity_id, ...otherServiceData } = serviceData;
        if (Object.keys(otherServiceData).length > 0) {
          Object.assign(requestBody, otherServiceData);
        }
      } else {
        // If no entity_id in serviceData, use the original structure
        if (serviceData && Object.keys(serviceData).length > 0) {
          Object.assign(requestBody, serviceData);
        }
        
        if (target) {
          if (target.entity_id) {
            requestBody.entity_id = target.entity_id;
          } else {
            requestBody.target = target;
          }
        }
      }

      console.log('Service call:', {
        domain,
        service,
        url: `${settings.url}/api/services/${domain}/${service}`,
        body: requestBody
      });

      // Make direct API call with correct format
      const response = await fetch(`${settings.url}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Service call failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Service call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // Refresh entities after service call to get updated states
      try {
        const states = await haApi.getStates();
        const entitiesMap: Record<string, HAEntity> = {};
        states.forEach((entity: HAEntity) => {
          entitiesMap[entity.entity_id] = entity;
        });
        setEntities(entitiesMap);
      } catch (refreshError) {
        console.warn('Failed to refresh entities after service call:', refreshError);
      }

      return result;
    } catch (err) {
      console.error('Service call error:', err);
      throw err;
    }
  }, [haApi, isConnected]);

  const testConnection = useCallback(async (url: string, token: string): Promise<boolean> => {
    try {
      const testApi = new HomeAssistantAPI({ url, token });
      return await testApi.testConnection();
    } catch (err) {
      console.error('Connection test error:', err);
      return false;
    }
  }, []);

  const updateSettings = useCallback(async (url: string, token: string): Promise<void> => {
    try {
      // Save settings to localStorage
      haConnectionSettings.set({ url, token });
      
      // Reconnect with new settings
      await connectToHomeAssistant(url, token);
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  }, [connectToHomeAssistant]);

  const retryConnection = useCallback(async (): Promise<void> => {
    const settings = haConnectionSettings.get();
    if (settings?.url && settings?.token) {
      setRetryCount(0);
      await connectToHomeAssistant(settings.url, settings.token);
    }
  }, [connectToHomeAssistant]);

  // Initialize connection on mount
  useEffect(() => {
    const settings = haConnectionSettings.get();
    if (settings?.url && settings?.token) {
      connectToHomeAssistant(settings.url, settings.token);
    } else {
      setConnectionStatus('disconnected');
    }

    return () => {
      clearReconnectTimeout();
    };
  }, [connectToHomeAssistant, clearReconnectTimeout]);

  // Listen for storage changes (auto-connect when settings become available)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'ha_connection_settings') {
        const newSettings = event.newValue ? JSON.parse(event.newValue) : null;
        
        if (newSettings?.url && newSettings?.token) {
          // Settings were added or updated - auto connect
          connectToHomeAssistant(newSettings.url, newSettings.token);
        } else {
          // Settings were removed
          if (haApi) {
            haApi.disconnect();
          }
          setIsConnected(false);
          setConnectionStatus('disconnected');
          setHaApi(null);
          setEntities({});
          setError(null);
          clearReconnectTimeout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [connectToHomeAssistant, clearReconnectTimeout, haApi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (haApi) {
        haApi.disconnect();
      }
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout, haApi]);

  const contextValue: HomeAssistantContextType = {
    isConnected,
    connectionStatus,
    haApi,
    entities,
    searchEntities,
    callService,
    testConnection,
    updateSettings,
    error,
    retryConnection,
  };

  return (
    <HomeAssistantContext.Provider value={contextValue}>
      {children}
    </HomeAssistantContext.Provider>
  );
};

export const useHomeAssistant = (): HomeAssistantContextType => {
  const context = useContext(HomeAssistantContext);
  if (context === undefined) {
    throw new Error('useHomeAssistant must be used within a HomeAssistantProvider');
  }
  return context;
};