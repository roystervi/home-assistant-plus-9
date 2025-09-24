import { haConnectionSettings } from './storage';

// Types and interfaces for Home Assistant integration
export interface HomeAssistantConfig {
  url: string;
  token: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistantService {
  domain: string;
  service: string;
  service_data?: Record<string, any>;
  target?: {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
  };
}

// Get current Home Assistant configuration
export function getHomeAssistantConfig(): HomeAssistantConfig | null {
  try {
    // First try to get from localStorage
    const settings = haConnectionSettings.get();
    if (settings?.url && settings?.token) {
      return {
        url: settings.url.trim(),
        token: settings.token.trim()
      };
    }

    // Fallback to environment variables
    const envUrl = process.env.NEXT_PUBLIC_HOME_ASSISTANT_URL;
    const envToken = process.env.NEXT_PUBLIC_HOME_ASSISTANT_TOKEN;

    if (envUrl && envToken) {
      return {
        url: envUrl.trim(),
        token: envToken.trim()
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting Home Assistant config:', error);
    return null;
  }
}

// Check if Home Assistant is properly configured
export function isHomeAssistantConfigured(): boolean {
  const config = getHomeAssistantConfig();
  if (!config) return false;

  const validation = validateHomeAssistantConfig(config);
  return validation.isValid;
}

// Validate Home Assistant configuration
export function validateHomeAssistantConfig(config: HomeAssistantConfig): ValidationResult {
  const errors: string[] = [];

  // Validate URL
  if (!config.url) {
    errors.push('Home Assistant URL is required');
  } else {
    try {
      const url = new URL(config.url);
      if (!url.protocol.startsWith('http')) {
        errors.push('Home Assistant URL must use HTTP or HTTPS protocol');
      }
      if (!url.hostname) {
        errors.push('Home Assistant URL must have a valid hostname');
      }
    } catch {
      errors.push('Home Assistant URL is not valid');
    }
  }

  // Validate token
  if (!config.token) {
    errors.push('Home Assistant access token is required');
  } else if (config.token.length < 10) {
    errors.push('Home Assistant access token appears to be too short');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Home Assistant API class with dynamic configuration
export class HomeAssistantAPI {
  private config: HomeAssistantConfig | null = null;

  constructor(config?: HomeAssistantConfig) {
    this.config = config || getHomeAssistantConfig();
  }

  // Update configuration dynamically
  updateConfig(config: HomeAssistantConfig): void {
    this.config = config;
  }

  // Get current configuration
  getConfig(): HomeAssistantConfig | null {
    return this.config;
  }

  // Check if API is ready to use
  isReady(): boolean {
    return this.config !== null && validateHomeAssistantConfig(this.config).isValid;
  }

  // Test connection to Home Assistant
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'No configuration available' };
    }

    const validation = validateHomeAssistantConfig(this.config);
    if (!validation.isValid) {
      return { success: false, error: validation.errors[0] };
    }

    try {
      const response = await fetch(`${this.config.url}/api/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid access token' };
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.message === 'API running.') {
        return { success: true };
      }

      return { success: false, error: 'Unexpected response from Home Assistant' };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { success: false, error: 'Cannot connect to Home Assistant. Check URL and network connection.' };
      }
      return { success: false, error: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Get all entities
  async getEntities(): Promise<HomeAssistantEntity[]> {
    if (!this.isReady()) {
      throw new Error('Home Assistant API not configured properly');
    }

    const response = await fetch(`${this.config!.url}/api/states`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config!.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entities: ${response.statusText}`);
    }

    return response.json();
  }

  // Get specific entity
  async getEntity(entityId: string): Promise<HomeAssistantEntity | null> {
    if (!this.isReady()) {
      throw new Error('Home Assistant API not configured properly');
    }

    const response = await fetch(`${this.config!.url}/api/states/${entityId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config!.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch entity: ${response.statusText}`);
    }

    return response.json();
  }

  // Call service
  async callService(service: HomeAssistantService): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Home Assistant API not configured properly');
    }

    const response = await fetch(`${this.config!.url}/api/services/${service.domain}/${service.service}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...service.service_data,
        ...service.target,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to call service: ${response.statusText}`);
    }

    return response.json();
  }

  // Get service list
  async getServices(): Promise<Record<string, any>> {
    if (!this.isReady()) {
      throw new Error('Home Assistant API not configured properly');
    }

    const response = await fetch(`${this.config!.url}/api/services`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config!.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }

    return response.json();
  }

  // Subscribe to events (WebSocket)
  createWebSocketConnection(): WebSocket | null {
    if (!this.isReady()) {
      console.error('Home Assistant API not configured properly');
      return null;
    }

    const wsUrl = this.config!.url.replace(/^http/, 'ws') + '/api/websocket';
    return new WebSocket(wsUrl);
  }
}

// Create Home Assistant API instance with dynamic config
export function createHomeAssistantAPIWithDynamicConfig(): HomeAssistantAPI {
  return new HomeAssistantAPI();
}

// Utility function to refresh API configuration
export function refreshHomeAssistantConfig(api: HomeAssistantAPI): boolean {
  const newConfig = getHomeAssistantConfig();
  if (newConfig) {
    api.updateConfig(newConfig);
    return true;
  }
  return false;
}

// Export default instance for convenience
export const homeAssistantAPI = createHomeAssistantAPIWithDynamicConfig();