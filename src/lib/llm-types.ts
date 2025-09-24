/**
 * Comprehensive TypeScript interfaces and types for the LLM service system
 * Includes support for multiple providers, function calling, device control, and web search
 */

// ============================================================================
// LLM Provider Types
// ============================================================================

/**
 * Supported LLM providers in the system
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google';

/**
 * Available models for each provider
 */
export type OpenAIModel = 
  | 'gpt-4o' 
  | 'gpt-4o-mini' 
  | 'gpt-4-turbo' 
  | 'gpt-3.5-turbo';

export type AnthropicModel = 
  | 'claude-3-5-sonnet-20241022' 
  | 'claude-3-haiku-20240307' 
  | 'claude-3-opus-20240229';

export type GoogleModel = 
  | 'gemini-1.5-pro' 
  | 'gemini-1.5-flash' 
  | 'gemini-pro';

export type LLMModel = OpenAIModel | AnthropicModel | GoogleModel;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Role of a message in a chat conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'function';

/**
 * Base message interface for chat conversations
 */
export interface BaseMessage {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Text content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Optional metadata associated with the message */
  metadata?: Record<string, any>;
}

/**
 * User message from human input
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  /** Optional attachments (images, files, etc.) */
  attachments?: MessageAttachment[];
}

/**
 * Assistant response message
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  /** Function calls made by the assistant */
  function_calls?: FunctionCall[];
  /** Whether this message is still being generated */
  streaming?: boolean;
  /** Confidence score for the response (0-1) */
  confidence?: number;
}

/**
 * System message for context and instructions
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
  /** Priority level for system messages */
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Function result message
 */
export interface FunctionMessage extends BaseMessage {
  role: 'function';
  /** Name of the function that was executed */
  function_name: string;
  /** Result of the function execution */
  result: any;
  /** Whether the function execution was successful */
  success: boolean;
  /** Error details if function execution failed */
  error?: string;
}

/**
 * Union type for all message types
 */
export type ChatMessage = UserMessage | AssistantMessage | SystemMessage | FunctionMessage;

/**
 * Message attachment interface
 */
export interface MessageAttachment {
  /** Type of attachment */
  type: 'image' | 'file' | 'audio' | 'video';
  /** URL or base64 data of the attachment */
  data: string;
  /** MIME type of the attachment */
  mimeType: string;
  /** Size in bytes */
  size?: number;
  /** Original filename */
  filename?: string;
}

// ============================================================================
// Function Calling Types
// ============================================================================

/**
 * Parameter definition for a function
 */
export interface FunctionParameter {
  /** Data type of the parameter */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Human-readable description of the parameter */
  description: string;
  /** Whether this parameter is required */
  required?: boolean;
  /** Enumerated values if applicable */
  enum?: string[] | number[];
  /** Default value for the parameter */
  default?: any;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Pattern for string validation */
  pattern?: string;
  /** Items schema for arrays */
  items?: FunctionParameter;
  /** Properties schema for objects */
  properties?: Record<string, FunctionParameter>;
}

/**
 * Function definition interface
 */
export interface FunctionDefinition {
  /** Unique name of the function */
  name: string;
  /** Human-readable description of what the function does */
  description: string;
  /** Parameters schema */
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required?: string[];
  };
  /** Categories this function belongs to */
  categories?: string[];
  /** Whether this function requires confirmation before execution */
  requires_confirmation?: boolean;
  /** Estimated execution time in milliseconds */
  estimated_duration?: number;
}

/**
 * Function call made by the assistant
 */
export interface FunctionCall {
  /** Unique identifier for this function call */
  id: string;
  /** Name of the function to call */
  name: string;
  /** Arguments to pass to the function */
  arguments: Record<string, any>;
  /** Status of the function call */
  status: 'pending' | 'executing' | 'completed' | 'failed';
  /** Result of the function execution */
  result?: any;
  /** Error message if execution failed */
  error?: string;
  /** Timestamp when the call was initiated */
  timestamp: Date;
  /** Duration of execution in milliseconds */
  duration?: number;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Base response interface from LLM providers
 */
export interface BaseLLMResponse {
  /** Generated text content */
  content: string;
  /** Model that generated the response */
  model: string;
  /** Usage statistics */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Response metadata */
  metadata?: Record<string, any>;
}

/**
 * OpenAI API response
 */
export interface OpenAIResponse extends BaseLLMResponse {
  /** OpenAI-specific response data */
  choices: Array<{
    message: {
      role: string;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: string;
    index: number;
  }>;
  /** Response ID from OpenAI */
  id: string;
  /** Object type */
  object: string;
  /** Creation timestamp */
  created: number;
}

/**
 * Anthropic API response
 */
export interface AnthropicResponse extends BaseLLMResponse {
  /** Anthropic-specific response data */
  id: string;
  /** Response type */
  type: 'message';
  /** Role of the response */
  role: 'assistant';
  /** Content blocks */
  content: Array<{
    type: 'text';
    text: string;
  }>;
  /** Stop reason */
  stop_reason: string;
  /** Stop sequence used */
  stop_sequence?: string;
}

/**
 * Google AI response
 */
export interface GoogleResponse extends BaseLLMResponse {
  /** Google-specific response data */
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  /** Prompt feedback */
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

/**
 * Unified LLM response type
 */
export type LLMResponse = OpenAIResponse | AnthropicResponse | GoogleResponse;

/**
 * Streaming response chunk
 */
export interface StreamingChunk {
  /** Chunk content */
  content: string;
  /** Whether this is the final chunk */
  finished: boolean;
  /** Function calls in this chunk */
  function_calls?: Partial<FunctionCall>[];
  /** Chunk metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Base configuration for LLM providers
 */
export interface BaseLLMConfig {
  /** API key for the provider */
  apiKey: string;
  /** Base URL for API requests (optional) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}

/**
 * OpenAI configuration
 */
export interface OpenAIConfig extends BaseLLMConfig {
  provider: 'openai';
  /** OpenAI model to use */
  model: OpenAIModel;
  /** Temperature for response randomness (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Top-p sampling parameter */
  top_p?: number;
  /** Frequency penalty */
  frequency_penalty?: number;
  /** Presence penalty */
  presence_penalty?: number;
  /** Organization ID */
  organization?: string;
}

/**
 * Anthropic configuration
 */
export interface AnthropicConfig extends BaseLLMConfig {
  provider: 'anthropic';
  /** Anthropic model to use */
  model: AnthropicModel;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Top-p sampling parameter */
  top_p?: number;
  /** Top-k sampling parameter */
  top_k?: number;
}

/**
 * Google AI configuration
 */
export interface GoogleConfig extends BaseLLMConfig {
  provider: 'google';
  /** Google model to use */
  model: GoogleModel;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_output_tokens?: number;
  /** Top-p sampling parameter */
  top_p?: number;
  /** Top-k sampling parameter */
  top_k?: number;
  /** Safety settings */
  safety_settings?: Array<{
    category: string;
    threshold: string;
  }>;
}

/**
 * Union type for all provider configurations
 */
export type LLMConfig = OpenAIConfig | AnthropicConfig | GoogleConfig;

// ============================================================================
// Device Function Types
// ============================================================================

/**
 * Thermostat control function parameters
 */
export interface ThermostatControlParams {
  /** Target temperature in degrees */
  temperature: number;
  /** Temperature unit */
  unit: 'celsius' | 'fahrenheit';
  /** Thermostat mode */
  mode?: 'heat' | 'cool' | 'auto' | 'off';
  /** Zone or room identifier */
  zone?: string;
}

/**
 * Alarm control function parameters
 */
export interface AlarmControlParams {
  /** Action to perform */
  action: 'arm' | 'disarm' | 'panic' | 'status';
  /** Alarm mode when arming */
  mode?: 'home' | 'away' | 'night';
  /** Security code for authentication */
  code?: string;
  /** Specific zones to control */
  zones?: string[];
}

/**
 * Device status query parameters
 */
export interface DeviceStatusParams {
  /** Device identifier or type */
  device_id?: string;
  /** Type of device to query */
  device_type?: 'thermostat' | 'alarm' | 'lights' | 'locks' | 'cameras' | 'all';
  /** Room or zone filter */
  zone?: string;
  /** Include detailed status information */
  detailed?: boolean;
}

/**
 * Energy usage query parameters
 */
export interface EnergyUsageParams {
  /** Time period for the query */
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  /** Start date for the query */
  start_date?: string;
  /** End date for the query */
  end_date?: string;
  /** Specific device to query */
  device_id?: string;
  /** Type of energy data */
  data_type?: 'consumption' | 'production' | 'cost' | 'all';
}

/**
 * Weather information query parameters
 */
export interface WeatherParams {
  /** Location for weather query */
  location?: string;
  /** Type of weather information */
  type?: 'current' | 'forecast' | 'alerts' | 'all';
  /** Number of forecast days */
  forecast_days?: number;
  /** Units for weather data */
  units?: 'metric' | 'imperial';
}

// ============================================================================
// Web Search Types
// ============================================================================

/**
 * Web search query parameters
 */
export interface WebSearchParams {
  /** Search query string */
  query: string;
  /** Number of results to return */
  num_results?: number;
  /** Language for search results */
  language?: string;
  /** Country/region for search */
  region?: string;
  /** Time filter for results */
  time_filter?: 'day' | 'week' | 'month' | 'year' | 'all';
  /** Search type */
  search_type?: 'web' | 'news' | 'images' | 'videos';
  /** Safe search setting */
  safe_search?: 'off' | 'moderate' | 'strict';
}

/**
 * Web search result item
 */
export interface WebSearchResult {
  /** Title of the result */
  title: string;
  /** URL of the result */
  url: string;
  /** Snippet/description */
  snippet: string;
  /** Publication date */
  published_date?: string;
  /** Source domain */
  source: string;
  /** Relevance score */
  score?: number;
  /** Result type */
  type: 'web' | 'news' | 'image' | 'video';
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Web search response
 */
export interface WebSearchResponse {
  /** Search results */
  results: WebSearchResult[];
  /** Total number of results found */
  total_results: number;
  /** Query that was searched */
  query: string;
  /** Time taken for search in milliseconds */
  search_time: number;
  /** Search suggestions */
  suggestions?: string[];
  /** Related searches */
  related_searches?: string[];
}

// ============================================================================
// Device Function Schemas
// ============================================================================

/**
 * Thermostat control function definition
 */
export const THERMOSTAT_CONTROL_FUNCTION: FunctionDefinition = {
  name: 'set_thermostat',
  description: 'Control the thermostat temperature and mode settings',
  parameters: {
    type: 'object',
    properties: {
      temperature: {
        type: 'number',
        description: 'Target temperature to set',
        minimum: 40,
        maximum: 90,
        required: true
      },
      unit: {
        type: 'string',
        description: 'Temperature unit',
        enum: ['celsius', 'fahrenheit'],
        default: 'fahrenheit'
      },
      mode: {
        type: 'string',
        description: 'Thermostat operation mode',
        enum: ['heat', 'cool', 'auto', 'off'],
        default: 'auto'
      },
      zone: {
        type: 'string',
        description: 'Specific zone or room to control',
      }
    },
    required: ['temperature']
  },
  categories: ['climate', 'home_automation'],
  requires_confirmation: false,
  estimated_duration: 2000
};

/**
 * Alarm control function definition
 */
export const ALARM_CONTROL_FUNCTION: FunctionDefinition = {
  name: 'control_alarm',
  description: 'Arm, disarm, or check status of the home security alarm system',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform on the alarm system',
        enum: ['arm', 'disarm', 'panic', 'status'],
        required: true
      },
      mode: {
        type: 'string',
        description: 'Alarm mode when arming the system',
        enum: ['home', 'away', 'night']
      },
      code: {
        type: 'string',
        description: 'Security code for alarm operations'
      },
      zones: {
        type: 'array',
        description: 'Specific zones to control',
        items: {
          type: 'string',
          description: 'Zone identifier'
        }
      }
    },
    required: ['action']
  },
  categories: ['security', 'home_automation'],
  requires_confirmation: true,
  estimated_duration: 3000
};

/**
 * Device status function definition
 */
export const DEVICE_STATUS_FUNCTION: FunctionDefinition = {
  name: 'get_device_status',
  description: 'Get current status and information about smart home devices',
  parameters: {
    type: 'object',
    properties: {
      device_id: {
        type: 'string',
        description: 'Specific device identifier to query'
      },
      device_type: {
        type: 'string',
        description: 'Type of devices to query',
        enum: ['thermostat', 'alarm', 'lights', 'locks', 'cameras', 'all']
      },
      zone: {
        type: 'string',
        description: 'Room or zone to filter devices'
      },
      detailed: {
        type: 'boolean',
        description: 'Include detailed status information',
        default: false
      }
    },
    required: []
  },
  categories: ['status', 'home_automation'],
  requires_confirmation: false,
  estimated_duration: 1500
};

/**
 * Energy usage function definition
 */
export const ENERGY_USAGE_FUNCTION: FunctionDefinition = {
  name: 'get_energy_usage',
  description: 'Retrieve energy consumption, production, and cost data',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Time period for energy data',
        enum: ['hour', 'day', 'week', 'month', 'year'],
        required: true
      },
      start_date: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format'
      },
      end_date: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format'
      },
      device_id: {
        type: 'string',
        description: 'Specific device to query energy usage'
      },
      data_type: {
        type: 'string',
        description: 'Type of energy data to retrieve',
        enum: ['consumption', 'production', 'cost', 'all'],
        default: 'all'
      }
    },
    required: ['period']
  },
  categories: ['energy', 'analytics'],
  requires_confirmation: false,
  estimated_duration: 2500
};

/**
 * Web search function definition
 */
export const WEB_SEARCH_FUNCTION: FunctionDefinition = {
  name: 'web_search',
  description: 'Search the web for current information and news',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find information',
        required: true
      },
      num_results: {
        type: 'number',
        description: 'Number of search results to return',
        minimum: 1,
        maximum: 20,
        default: 5
      },
      search_type: {
        type: 'string',
        description: 'Type of search to perform',
        enum: ['web', 'news', 'images', 'videos'],
        default: 'web'
      },
      time_filter: {
        type: 'string',
        description: 'Time range filter for results',
        enum: ['day', 'week', 'month', 'year', 'all'],
        default: 'all'
      }
    },
    required: ['query']
  },
  categories: ['search', 'information'],
  requires_confirmation: false,
  estimated_duration: 3000
};

/**
 * Weather information function definition
 */
export const WEATHER_FUNCTION: FunctionDefinition = {
  name: 'get_weather',
  description: 'Get current weather conditions and forecasts',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Location for weather information (city, zip code, etc.)'
      },
      type: {
        type: 'string',
        description: 'Type of weather information to retrieve',
        enum: ['current', 'forecast', 'alerts', 'all'],
        default: 'current'
      },
      forecast_days: {
        type: 'number',
        description: 'Number of forecast days to include',
        minimum: 1,
        maximum: 14,
        default: 5
      },
      units: {
        type: 'string',
        description: 'Units for weather data',
        enum: ['metric', 'imperial'],
        default: 'imperial'
      }
    },
    required: []
  },
  categories: ['weather', 'information'],
  requires_confirmation: false,
  estimated_duration: 2000
};

// ============================================================================
// Assistant Types
// ============================================================================

/**
 * Assistant personality and behavior configuration
 */
export interface AssistantPersonality {
  /** Assistant name */
  name: string;
  /** Personality description */
  personality: string;
  /** Communication style */
  style: 'professional' | 'casual' | 'friendly' | 'technical' | 'concise';
  /** Expertise areas */
  expertise: string[];
  /** Default response language */
  language: string;
  /** Proactivity level (0-1) */
  proactivity: number;
}

/**
 * Assistant capabilities configuration
 */
export interface AssistantCapabilities {
  /** Available function definitions */
  functions: FunctionDefinition[];
  /** Enabled integrations */
  integrations: {
    web_search: boolean;
    home_automation: boolean;
    weather: boolean;
    calendar: boolean;
    email: boolean;
  };
  /** Maximum conversation context length */
  max_context_length: number;
  /** Whether to remember conversation history */
  memory_enabled: boolean;
  /** Learning and adaptation settings */
  learning: {
    enabled: boolean;
    user_preferences: boolean;
    usage_patterns: boolean;
  };
}

/**
 * Assistant state and status
 */
export interface AssistantState {
  /** Current status */
  status: 'idle' | 'thinking' | 'responding' | 'executing_function' | 'error';
  /** Currently active conversation */
  active_conversation?: string;
  /** Number of active function calls */
  pending_functions: number;
  /** Last activity timestamp */
  last_activity: Date;
  /** Current model being used */
  current_model: LLMModel;
  /** Available models */
  available_models: LLMModel[];
  /** System health indicators */
  health: {
    api_status: 'online' | 'offline' | 'degraded';
    response_time: number;
    error_rate: number;
  };
}

/**
 * Complete assistant configuration
 */
export interface AssistantConfig {
  /** Unique assistant identifier */
  id: string;
  /** Assistant personality and behavior */
  personality: AssistantPersonality;
  /** LLM provider configuration */
  llm_config: LLMConfig;
  /** Assistant capabilities */
  capabilities: AssistantCapabilities;
  /** Current assistant state */
  state: AssistantState;
  /** System prompts and instructions */
  system_prompts: {
    base_prompt: string;
    function_prompt?: string;
    safety_prompt?: string;
  };
  /** Rate limiting configuration */
  rate_limits: {
    requests_per_minute: number;
    tokens_per_minute: number;
    concurrent_functions: number;
  };
  /** Logging and monitoring settings */
  monitoring: {
    log_conversations: boolean;
    log_function_calls: boolean;
    performance_tracking: boolean;
    error_reporting: boolean;
  };
}

/**
 * Conversation context and management
 */
export interface ConversationContext {
  /** Unique conversation identifier */
  id: string;
  /** User identifier */
  user_id: string;
  /** Conversation title */
  title: string;
  /** Message history */
  messages: ChatMessage[];
  /** Conversation metadata */
  metadata: {
    created_at: Date;
    updated_at: Date;
    message_count: number;
    total_tokens: number;
    tags: string[];
  };
  /** Conversation settings */
  settings: {
    auto_save: boolean;
    max_messages: number;
    context_window: number;
    function_calling_enabled: boolean;
  };
  /** User preferences for this conversation */
  user_preferences?: {
    response_style: string;
    preferred_functions: string[];
    disabled_functions: string[];
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * API error response
 */
export interface APIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, any>;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Function execution result
 */
export interface FunctionResult<T = any> {
  /** Whether execution was successful */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Function metadata */
  metadata?: Record<string, any>;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining_requests: number;
  /** Tokens remaining in current window */
  remaining_tokens: number;
  /** Window reset timestamp */
  reset_time: Date;
  /** Rate limit window duration in seconds */
  window_duration: number;
}

/**
 * System health metrics
 */
export interface SystemMetrics {
  /** API response times */
  response_times: {
    avg: number;
    min: number;
    max: number;
    p95: number;
  };
  /** Success rates */
  success_rates: {
    api_calls: number;
    function_executions: number;
    conversations: number;
  };
  /** Resource usage */
  resource_usage: {
    memory: number;
    cpu: number;
    storage: number;
  };
  /** Error statistics */
  errors: {
    total_count: number;
    error_rate: number;
    common_errors: Array<{ code: string; count: number }>;
  };
}

/**
 * Model capabilities and features
 */
export interface ModelCapabilities {
  /** Maximum tokens the model can handle */
  maxTokens: number;
  /** Whether the model supports function calling */
  supportsFunctions: boolean;
  /** Whether the model supports streaming responses */
  supportsStreaming: boolean;
  /** Supported languages */
  supportedLanguages: string[];
  /** Context window size */
  contextWindow: number;
  /** Cost per 1000 tokens */
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Tokens used in prompt */
  promptTokens: number;
  /** Tokens used in completion */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/**
 * LLM-specific error interface (extends APIError)
 */
export interface LLMError extends APIError {
  /** LLM provider that caused the error */
  provider?: LLMProvider;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Seconds to wait before retrying */
  retryAfter?: number;
}