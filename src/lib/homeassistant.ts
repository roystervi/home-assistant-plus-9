// File path: src/lib/homeassistant.ts

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HAWebSocketMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

export interface HAAuthMessage extends HAWebSocketMessage {
  type: 'auth';
  access_token: string;
}

export interface HAAuthOkMessage extends HAWebSocketMessage {
  type: 'auth_ok';
  ha_version: string;
}

export interface HAAuthRequiredMessage extends HAWebSocketMessage {
  type: 'auth_required';
  ha_version: string;
}

export interface HAStateChangedMessage extends HAWebSocketMessage {
  type: 'event';
  event: {
    event_type: 'state_changed';
    data: {
      entity_id: string;
      old_state: HAEntity | null;
      new_state: HAEntity | null;
    };
  };
}

export interface HAStatesResponse {
  [entity_id: string]: HAEntity;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface HAConfig {
  url: string;
  token: string;
  entities?: string[];
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface HAError extends Error {
  code?: string;
  status?: number;
}

// Specific entity IDs from the user's setup
export const MAIN_ENTITIES = [
  'sensor.bobby_s_energy_this_month',
  'sensor.bobby_s_energy_today', 
  'sensor.bobby_s_power_minute_average'
] as const;

export const DEVICE_ENTITIES = [
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
] as const;

export const ALL_ENTITIES = [...MAIN_ENTITIES, ...DEVICE_ENTITIES] as const;

export type MainEntityId = typeof MAIN_ENTITIES[number];
export type DeviceEntityId = typeof DEVICE_ENTITIES[number];
export type AllEntityId = typeof ALL_ENTITIES[number];

class HomeAssistantAPI {
  private config: HAConfig;
  private ws: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private messageId = 1;
  private pendingMessages = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private entityStates = new Map<string, HAEntity>();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscribedToEvents = false;

  constructor(config?: Partial<HAConfig>) {
    const defaultConfig = {
            url: process.env.HOME_ASSISTANT_URL || 'http://192.168.1.54:8123',
            token: process.env.HOME_ASSISTANT_TOKEN || '',
            autoReconnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            entities: [
                ...ALL_ENTITIES
            ]
        };
    
    this.config = { ...defaultConfig, ...config };
  }

  // Test connection to Home Assistant
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRestRequest('/api/');
      return response && response.message === 'API running.';
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Search entities by query string - NEW METHOD
  async searchEntities(query: string, limit: number = 20): Promise<HAEntity[]> {
    try {
      const allStates = await this.getStates();
      
      if (!query.trim()) {
        return allStates.slice(0, limit);
      }
      
      const queryLower = query.toLowerCase();
      
      return allStates
        .filter(entity => {
          const entityIdMatch = entity.entity_id.toLowerCase().includes(queryLower);
          const friendlyNameMatch = entity.attributes.friendly_name?.toLowerCase().includes(queryLower);
          return entityIdMatch || friendlyNameMatch;
        })
        .sort((a, b) => {
          // Prioritize exact entity_id matches
          const aExact = a.entity_id.toLowerCase().startsWith(queryLower) ? 0 : 1;
          const bExact = b.entity_id.toLowerCase().startsWith(queryLower) ? 0 : 1;
          
          if (aExact !== bExact) return aExact - bExact;
          
          // Then sort alphabetically
          return a.entity_id.localeCompare(b.entity_id);
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to search entities:', error);
      return [];
    }
  }

  // Get entities by domain (e.g., "light", "switch", "sensor") - NEW METHOD
  async getEntitiesByDomain(domain: string, limit: number = 50): Promise<HAEntity[]> {
    try {
      const allStates = await this.getStates();
      
      return allStates
        .filter(entity => entity.entity_id.startsWith(`${domain}.`))
        .sort((a, b) => a.entity_id.localeCompare(b.entity_id))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get entities by domain:', error);
      return [];
    }
  }

  // Get all available domains - NEW METHOD
  async getAvailableDomains(): Promise<string[]> {
    try {
      const allStates = await this.getStates();
      const domains = new Set<string>();
      
      allStates.forEach(entity => {
        const domain = entity.entity_id.split('.')[0];
        if (domain) {
          domains.add(domain);
        }
      });
      
      return Array.from(domains).sort();
    } catch (error) {
      console.error('Failed to get available domains:', error);
      return [];
    }
  }

  // Enhanced entity filtering - NEW METHOD
  async filterEntities(options: {
    query?: string;
    domains?: string[];
    deviceClasses?: string[];
    states?: string[];
    limit?: number;
  }): Promise<HAEntity[]> {
    try {
      const { query, domains, deviceClasses, states, limit = 20 } = options;
      let entities = await this.getStates();
      
      // Filter by domains
      if (domains && domains.length > 0) {
        entities = entities.filter(entity => {
          const domain = entity.entity_id.split('.')[0];
          return domains.includes(domain);
        });
      }
      
      // Filter by device classes
      if (deviceClasses && deviceClasses.length > 0) {
        entities = entities.filter(entity => 
          deviceClasses.includes(entity.attributes.device_class)
        );
      }
      
      // Filter by states
      if (states && states.length > 0) {
        entities = entities.filter(entity => states.includes(entity.state));
      }
      
      // Filter by query
      if (query && query.trim()) {
        const queryLower = query.toLowerCase();
        entities = entities.filter(entity => {
          const entityIdMatch = entity.entity_id.toLowerCase().includes(queryLower);
          const friendlyNameMatch = entity.attributes.friendly_name?.toLowerCase().includes(queryLower);
          return entityIdMatch || friendlyNameMatch;
        });
      }
      
      // Sort and limit results
      return entities
        .sort((a, b) => {
          if (query) {
            const queryLower = query.toLowerCase();
            const aExact = a.entity_id.toLowerCase().startsWith(queryLower) ? 0 : 1;
            const bExact = b.entity_id.toLowerCase().startsWith(queryLower) ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
          }
          return a.entity_id.localeCompare(b.entity_id);
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to filter entities:', error);
      return [];
    }
  }

  // Connect WebSocket with Promise return
  async connectWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      try {
        this.setConnectionStatus('connecting');
        const wsUrl = (process.env.HOME_ASSISTANT_WS_URL || this.config.url.replace(/^http/, 'ws')) + '/api/websocket';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connection opened');
        };

        this.ws.onmessage = async (event) => {
          try {
            const message: HAWebSocketMessage = JSON.parse(event.data);
            await this.handleMessage(message, resolve, reject);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setConnectionStatus('error');
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        this.setConnectionStatus('error');
        reject(error);
      }
    });
  }

  // Get states with optional entity filtering
  async getStates(entityIds?: string[]): Promise<HAEntity[]> {
    try {
      const allStates = await this.makeRestRequest('/api/states');
      
      if (entityIds && entityIds.length > 0) {
        return allStates.filter((state: HAEntity) => entityIds.includes(state.entity_id));
      }
      
      return allStates;
    } catch (error) {
      console.error('Failed to get states:', error);
      throw error;
    }
  }

  private async connectInternal(): Promise<void> {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.setConnectionStatus('connecting');
        const wsUrl = (process.env.HOME_ASSISTANT_WS_URL || this.config.url.replace(/^http/, 'ws')) + '/api/websocket';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connection opened');
        };

        this.ws.onmessage = async (event) => {
          try {
            const message: HAWebSocketMessage = JSON.parse(event.data);
            await this.handleMessage(message, resolve, reject);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setConnectionStatus('error');
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        this.setConnectionStatus('error');
        reject(error);
      }
    });
  }

  // Public connect method
  async connect(): Promise<void> {
    return this.connectInternal();
  }

  private async handleMessage(
    message: HAWebSocketMessage,
    connectResolve?: (value: any) => void,
    connectReject?: (error: Error) => void
  ): Promise<void> {
    switch (message.type) {
      case 'auth_required':
        await this.authenticate();
        break;

      case 'auth_ok':
        console.log('Authentication successful');
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        await this.subscribeToStateChanges();
        await this.loadInitialStates();
        this.startHeartbeat();
        if (connectResolve) {
          if (this.ws) {
            connectResolve(this.ws);
          } else {
            connectReject?.(new Error('WebSocket connection lost'));
          }
        }
        break;

      case 'auth_invalid':
        const authError = new Error('Authentication failed: Invalid token');
        this.setConnectionStatus('error');
        connectReject?.(authError);
        this.emit('error', authError);
        break;

      case 'event':
        this.handleStateEvent(message as HAStateChangedMessage);
        break;

      case 'result':
        this.handleResult(message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private async authenticate(): Promise<void> {
    const authMessage: HAAuthMessage = {
      type: 'auth',
      access_token: this.config.token
    };
    this.sendMessage(authMessage);
  }

  private async subscribeToStateChanges(): Promise<void> {
    if (this.subscribedToEvents) return;

    const subscribeMessage: HAWebSocketMessage = {
      id: this.getNextMessageId(),
      type: 'subscribe_events',
      event_type: 'state_changed'
    };

    await this.sendMessageWithResponse(subscribeMessage);
    this.subscribedToEvents = true;
  }

  private async loadInitialStates(): Promise<void> {
    try {
      const states = await this.getStates();
      const targetEntities = this.config.entities || [];
      
      for (const entityId of targetEntities) {
        const state = states.find(s => s.entity_id === entityId);
        if (state) {
          this.entityStates.set(entityId, state);
        }
      }

      this.emit('states_loaded', this.getEntityStates());
    } catch (error) {
      console.error('Failed to load initial states:', error);
    }
  }

  private handleStateEvent(message: HAStateChangedMessage): void {
    const { entity_id, new_state, old_state } = message.event.data;
    
    if (new_state && this.isTrackedEntity(entity_id)) {
      this.entityStates.set(entity_id, new_state);
      this.emit('state_changed', {
        entity_id,
        new_state,
        old_state
      });
      this.emit(`state_changed:${entity_id}`, new_state);
    }
  }

  private handleResult(message: HAWebSocketMessage): void {
    const { id } = message;
    if (id && this.pendingMessages.has(id)) {
      const { resolve, reject } = this.pendingMessages.get(id)!;
      this.pendingMessages.delete(id);

      if (message.success) {
        resolve(message.result);
      } else {
        reject(new Error(message.error?.message || 'Request failed'));
      }
    }
  }

  private handleDisconnection(): void {
    this.setConnectionStatus('disconnected');
    this.subscribedToEvents = false;
    this.clearHeartbeat();
    
    if (this.config.autoReconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.min(this.reconnectAttempts, 5);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionStatus === 'connected') {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // REST API Methods
  async getState(entityId: string): Promise<HAEntity | null> {
    try {
      const response = await this.makeRestRequest(`/api/states/${entityId}`);
      return response;
    } catch (error) {
      if ((error as HAError).status === 404) {
        return null;
      }
      throw error;
    }
  }

  async callService(domain: string, service: string, serviceData?: any, target?: any): Promise<any> {
    const data: any = {};
    if (serviceData) data.service_data = serviceData;
    if (target) data.target = target;

    return this.makeRestRequest(`/api/services/${domain}/${service}`, 'POST', data);
  }

  private async makeRestRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${this.config.url}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await this.fetchWithRetry(url, options);
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as HAError;
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries: number = 3): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok || i === retries) {
          return response;
        }
      } catch (error) {
        if (i === retries) throw error;
        await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw new Error('Max retries exceeded');
  }

  private sendMessage(message: HAWebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private async sendMessageWithResponse(message: HAWebSocketMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!message.id) {
        message.id = this.getNextMessageId();
      }

      this.pendingMessages.set(message.id, { resolve, reject });
      this.sendMessage(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(message.id!)) {
          this.pendingMessages.delete(message.id!);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private getNextMessageId(): number {
    return this.messageId++;
  }

  // Entity Management
  getEntityStates(): Record<string, HAEntity> {
    const states: Record<string, HAEntity> = {};
    for (const [entityId, state] of this.entityStates) {
      states[entityId] = state;
    }
    return states;
  }

  getEntityState(entityId: string): HAEntity | undefined {
    return this.entityStates.get(entityId);
  }

  getMainEntityStates(): Record<MainEntityId, HAEntity | undefined> {
    const states: Record<string, HAEntity | undefined> = {};
    for (const entityId of MAIN_ENTITIES) {
      states[entityId] = this.entityStates.get(entityId);
    }
    return states as Record<MainEntityId, HAEntity | undefined>;
  }

  getDeviceEntityStates(): Record<DeviceEntityId, HAEntity | undefined> {
    const states: Record<string, HAEntity | undefined> = {};
    for (const entityId of DEVICE_ENTITIES) {
      states[entityId] = this.entityStates.get(entityId);
    }
    return states as Record<DeviceEntityId, HAEntity | undefined>;
  }

  private isTrackedEntity(entityId: string): boolean {
    return !this.config.entities || this.config.entities.includes(entityId);
  }

  // Event System
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  // Status Management
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.emit('connection_status', status);
    }
  }

  // Data Transformation Utilities
  transformEnergyData(entities: Record<string, HAEntity | undefined>): Array<{
    entityId: string;
    name: string;
    value: number;
    unit: string;
    lastUpdated: string;
  }> {
    return Object.entries(entities)
      .filter(([_, entity]) => entity !== undefined)
      .map(([entityId, entity]) => ({
        entityId,
        name: entity!.attributes.friendly_name || entityId.replace('sensor.', '').replace(/_/g, ' '),
        value: parseFloat(entity!.state) || 0,
        unit: entity!.attributes.unit_of_measurement || '',
        lastUpdated: entity!.last_updated
      }));
  }

  getTotalEnergyConsumption(): number {
    let total = 0;
    for (const entityId of DEVICE_ENTITIES) {
      const entity = this.entityStates.get(entityId);
      if (entity) {
        total += parseFloat(entity.state) || 0;
      }
    }
    return total;
  }

  // Utility Methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.clearHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionStatus('disconnected');
    this.pendingMessages.clear();
    this.entityStates.clear();
    this.subscribedToEvents = false;
  }

  // Update configuration
  updateConfig(newConfig: Partial<HAConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
let haApiInstance: HomeAssistantAPI | null = null;

export function createHomeAssistantAPI(config?: Partial<HAConfig>): HomeAssistantAPI {
  if (haApiInstance) {
    haApiInstance.disconnect();
  }
  haApiInstance = new HomeAssistantAPI(config);
  return haApiInstance;
}

export function getHomeAssistantAPI(): HomeAssistantAPI | null {
  return haApiInstance;
}

export { HomeAssistantAPI };