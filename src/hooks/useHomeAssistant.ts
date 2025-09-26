import { useState, useEffect, useCallback } from 'react'
import { haConnectionSettings } from '@/lib/storage'

// Home Assistant Entity interface
interface HomeAssistantEntity {
  entity_id: string
  state: string
  attributes: {
    [key: string]: any
    friendly_name?: string
    unit_of_measurement?: string
    device_class?: string
    icon?: string
  }
  last_changed: string
  last_updated: string
  context: {
    id: string
    parent_id: string | null
    user_id: string | null
  }
}

// Entity collection type (key-value object)
interface EntityCollection {
  [entity_id: string]: HomeAssistantEntity
}

// Energy data interface for processed energy entities
interface EnergyData {
  entity_id: string
  name: string
  state: number
  unit: string
  lastUpdated: string
}

// Hook configuration options
interface UseHomeAssistantConfig {
  baseUrl?: string
  accessToken?: string | null
  autoFetch?: boolean
  fetchInterval?: number
}

// Hook return type
interface UseHomeAssistantReturn {
  entities: EntityCollection
  isConnected: boolean
  isLoading: boolean
  error: string | null
  fetchEntities: () => Promise<void>
  clearError: () => void
  // Legacy compatibility properties
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  loading: boolean
  lastSync: Date | null
  syncingData: boolean
  // Connection management functions
  connect: () => Promise<void>
  disconnect: () => void
  syncData: () => Promise<void>
  reconnect: () => Promise<void>
  // Energy-specific functions
  getMainEnergyData: () => EnergyData[]
  getDeviceEnergyData: () => EnergyData[]
  getTotalConsumption: () => number
  isEntityAvailable: (entityId: string) => boolean
  getEntity: (entityId: string) => HomeAssistantEntity | null
}

// Error types for better error handling
enum HomeAssistantErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  CORS_ERROR = 'CORS_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Define main energy entities (based on conversation history)
const MAIN_ENERGY_ENTITIES = [
  'sensor.bobby_s_energy_this_month',
  'sensor.bobby_s_energy_today', 
  'sensor.bobby_s_power_minute_average'
]

// Define device energy entities (based on conversation history)
const DEVICE_ENERGY_ENTITIES = [
  'sensor.air_handler_energy_this_month',
  'sensor.den_garage_energy_this_month',
  'sensor.driveway_receptacle_energy_this_month',
  'sensor.fridge_energy_this_month',
  'sensor.hallway_manifold_energy_this_month',
  'sensor.heat_pump_energy_this_month',
  'sensor.hot_water_tank_energy_this_month',
  'sensor.jen_liv_rm_recp_hallw_energy_this_month',
  'sensor.kitchen_receptacles_energy_this_month',
  'sensor.masterbed_floor_heating_energy_this_month',
  'sensor.network_switch_energy_this_month',
  'sensor.pump_energy_this_month',
  'sensor.stove_energy_this_month',
  'sensor.washer_receptacles_energy_this_month'
]

export const useHomeAssistant = (config: UseHomeAssistantConfig = {}): UseHomeAssistantReturn => {
  // Get settings from storage instead of using hardcoded values
  const getStoredUrl = () => haConnectionSettings.getSetting("url") || 'http://192.168.1.54:8123'
  const getStoredToken = () => haConnectionSettings.getSetting("token") || null
  const getStoredTimeout = () => haConnectionSettings.getSetting("connectionTimeout") || 10000

  const {
    baseUrl = getStoredUrl(),
    accessToken = getStoredToken(),
    autoFetch = true,
    fetchInterval = 30000 // 30 seconds
  } = config

  const [entities, setEntities] = useState<EntityCollection>({})
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [syncingData, setSyncingData] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // State to track current settings so we can react to changes
  const [currentUrl, setCurrentUrl] = useState<string>(getStoredUrl())
  const [currentToken, setCurrentToken] = useState<string | null>(getStoredToken())

  // Legacy compatibility computed properties
  const connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' = 
    error ? 'error' : 
    isLoading ? 'connecting' : 
    isConnected ? 'connected' : 'disconnected'

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Create headers for API requests
  const createHeaders = useCallback(() => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = currentToken || accessToken
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }, [currentToken, accessToken])

  // Parse and categorize errors
  const handleError = useCallback((err: any, context: string) => {
    let errorMessage = 'Unknown error occurred'
    let errorType = HomeAssistantErrorType.UNKNOWN_ERROR

    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorType = HomeAssistantErrorType.NETWORK_ERROR
      errorMessage = 'Network error: Unable to connect to Home Assistant. Check if the service is running and accessible.'
    } else if (err.name === 'AbortError') {
      errorType = HomeAssistantErrorType.TIMEOUT_ERROR
      errorMessage = 'Request timeout: Home Assistant took too long to respond.'
    } else if (err.message?.includes('CORS')) {
      errorType = HomeAssistantErrorType.CORS_ERROR
      errorMessage = 'CORS error: Home Assistant may not allow cross-origin requests from this domain.'
    } else if (err.status === 401 || err.status === 403) {
      errorType = HomeAssistantErrorType.AUTHENTICATION_ERROR
      errorMessage = 'Authentication error: Invalid or missing access token.'
    } else if (err instanceof SyntaxError) {
      errorType = HomeAssistantErrorType.PARSE_ERROR
      errorMessage = 'Parse error: Invalid response from Home Assistant.'
    } else if (err.message) {
      errorMessage = err.message
    }

    console.error(`[HomeAssistant] ${context}:`, { errorType, error: err })
    setError(`${errorMessage} (${errorType})`)
    setIsConnected(false)
  }, [])

  // Fetch entities from Home Assistant REST API
  const fetchEntities = useCallback(async (): Promise<void> => {
    const url = currentUrl || baseUrl
    const token = currentToken || accessToken

    if (!url) {
      setError('Base URL is required')
      return
    }

    if (!token) {
      setError('Access token is required')
      return
    }

    setIsLoading(true)
    setSyncingData(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), getStoredTimeout())

    try {
      const response = await fetch(`${url}/api/states`, {
        method: 'GET',
        headers: createHeaders(),
        signal: controller.signal,
        mode: 'cors',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw {
          status: response.status,
          message: `HTTP ${response.status}: ${errorText}`,
        }
      }

      const entitiesArray: HomeAssistantEntity[] = await response.json()

      if (!Array.isArray(entitiesArray)) {
        throw new SyntaxError('Expected array response from /api/states')
      }

      // Convert array to key-value object
      const entityCollection: EntityCollection = {}
      entitiesArray.forEach((entity) => {
        if (entity.entity_id) {
          entityCollection[entity.entity_id] = entity
        }
      })

      setEntities(entityCollection)
      setIsConnected(true)
      setError(null)
      setLastSync(new Date())
      console.log(`[HomeAssistant] Successfully fetched ${entitiesArray.length} entities`)
    } catch (err: any) {
      clearTimeout(timeoutId)
      handleError(err, 'fetchEntities')
    } finally {
      setIsLoading(false)
      setSyncingData(false)
    }
  }, [currentUrl, currentToken, baseUrl, accessToken, createHeaders, handleError])

  // Monitor settings changes and update internal state
  useEffect(() => {
    const checkSettingsChange = () => {
      const newUrl = getStoredUrl()
      const newToken = getStoredToken()
      
      if (newUrl !== currentUrl || newToken !== currentToken) {
        console.log('[HomeAssistant] Settings changed, updating connection')
        setCurrentUrl(newUrl)
        setCurrentToken(newToken)
        
        // If we have both URL and token, try to reconnect
        if (newUrl && newToken) {
          setIsConnected(false) // Reset connection status
          fetchEntities()
        } else {
          setIsConnected(false)
          setEntities({})
          setError('Missing URL or token')
        }
      }
    }

    // Check immediately
    checkSettingsChange()

    // Set up interval to check for settings changes
    const interval = setInterval(checkSettingsChange, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [currentUrl, currentToken, fetchEntities])

  // Connection management functions
  const connect = useCallback(async (): Promise<void> => {
    await fetchEntities()
  }, [fetchEntities])

  const disconnect = useCallback(() => {
    setIsConnected(false)
    setEntities({})
    setLastSync(null)
  }, [])

  const syncData = useCallback(async (): Promise<void> => {
    await fetchEntities()
  }, [fetchEntities])

  const reconnect = useCallback(async (): Promise<void> => {
    disconnect()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    await connect()
  }, [connect, disconnect])

  // Helper function to parse entity state as number
  const parseEntityState = useCallback((entity: HomeAssistantEntity): number => {
    const numericState = parseFloat(entity.state)
    return isNaN(numericState) ? 0 : numericState
  }, [])

  // Helper function to format entity data
  const formatEntityData = useCallback((entity: HomeAssistantEntity): EnergyData => {
    return {
      entity_id: entity.entity_id,
      name: entity.attributes.friendly_name || entity.entity_id,
      state: parseEntityState(entity),
      unit: entity.attributes.unit_of_measurement || 'kWh',
      lastUpdated: entity.last_updated
    }
  }, [parseEntityState])

  // Get main energy data
  const getMainEnergyData = useCallback((): EnergyData[] => {
    return MAIN_ENERGY_ENTITIES
      .map(entityId => entities[entityId])
      .filter(Boolean)
      .map(formatEntityData)
  }, [entities, formatEntityData])

  // Get device energy data  
  const getDeviceEnergyData = useCallback((): EnergyData[] => {
    return DEVICE_ENERGY_ENTITIES
      .map(entityId => entities[entityId])
      .filter(Boolean)
      .map(formatEntityData)
  }, [entities, formatEntityData])

  // Calculate total consumption from all device entities
  const getTotalConsumption = useCallback((): number => {
    const deviceData = getDeviceEnergyData()
    return deviceData.reduce((total, device) => total + device.state, 0)
  }, [getDeviceEnergyData])

  // Check if entity is available
  const isEntityAvailable = useCallback((entityId: string): boolean => {
    const entity = entities[entityId]
    return entity !== undefined && entity.state !== 'unavailable' && entity.state !== 'unknown'
  }, [entities])

  // Get specific entity by ID
  const getEntity = useCallback((entityId: string): HomeAssistantEntity | null => {
    return entities[entityId] || null
  }, [entities])

  // Initial fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && currentUrl && currentToken) {
      fetchEntities()
    }
  }, [autoFetch, currentUrl, currentToken, fetchEntities])

  // Set up periodic refresh
  useEffect(() => {
    if (!autoFetch || !isConnected || fetchInterval <= 0) return

    const intervalId = setInterval(() => {
      fetchEntities()
    }, fetchInterval)

    return () => clearInterval(intervalId)
  }, [autoFetch, isConnected, fetchInterval, fetchEntities])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (autoFetch && currentUrl && currentToken) {
        fetchEntities()
      }
    }

    const handleOffline = () => {
      setIsConnected(false)
      setError('Device is offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoFetch, currentUrl, currentToken, fetchEntities])

  return {
    entities,
    isConnected,
    isLoading,
    error,
    fetchEntities,
    clearError,
    // Legacy compatibility properties
    connectionStatus,
    loading: isLoading,
    lastSync,
    syncingData,
    // Connection management functions
    connect,
    disconnect,
    syncData,
    reconnect,
    // Energy-specific functions
    getMainEnergyData,
    getDeviceEnergyData,
    getTotalConsumption,
    isEntityAvailable,
    getEntity,
  }
}

// Export types for external use
export type {
  HomeAssistantEntity,
  EntityCollection,
  EnergyData,
  UseHomeAssistantConfig,
  UseHomeAssistantReturn,
}

export { HomeAssistantErrorType }