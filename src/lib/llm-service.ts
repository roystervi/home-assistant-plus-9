import { 
  LLMProvider, 
  LLMModel, 
  ChatMessage, 
  FunctionDefinition, 
  FunctionCall, 
  LLMConfig,
  ConversationContext,
  BaseLLMResponse,
  StreamingChunk,
  OpenAIConfig,
  AnthropicConfig,
  GoogleConfig,
  APIError,
  FunctionResult,
  AssistantConfig,
  SystemMetrics
} from './llm-types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Additional types needed
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface ModelCapabilities {
  maxTokens: number;
  supportsFunctions: boolean;
  supportsStreaming: boolean;
  supportedLanguages: string[];
  contextWindow: number;
  costPer1kTokens: { input: number; output: number };
}

interface LLMError {
  code: string;
  message: string;
  provider: LLMProvider;
  retryable: boolean;
  retryAfter?: number;
}

interface LLMResponse {
  content: string;
  functionCall?: FunctionCall;
  tokenUsage: TokenUsage;
  model: string;
  provider: string;
}

interface ProviderCredentials {
  openai?: {
    apiKey: string;
    baseURL?: string;
  };
  anthropic?: {
    apiKey: string;
    baseURL?: string;
  };
  google?: {
    apiKey: string;
    baseURL?: string;
  };
}

interface ConversationMemory {
  [conversationId: string]: ConversationContext;
}

interface RateLimitInfo {
  requests: number;
  tokens: number;
  resetTime: number;
}

interface ProviderRateLimits {
  [provider: string]: RateLimitInfo;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  details: {
    families: string[];
    family: string;
    format: string;
    parameter_size: string;
    quantization_level: string;
  };
}

class LLMService {
  private static instance: LLMService;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  private ollamaBaseUrl: string = 'http://localhost:11434';
  
  private currentProvider: LLMProvider = 'google';
  private currentModel: LLMModel = 'gemini-1.5-flash';
  private conversations: ConversationMemory = {};
  private rateLimits: ProviderRateLimits = {};
  private credentials: ProviderCredentials = {};
  private retryDelay: number = 1000;
  
  private config: LLMConfig = {
    provider: 'google',
    model: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000,
    streamResponse: true,
    enableFunctionCalling: true,
    rateLimitRpm: 60,
    retryAttempts: 3,
    timeoutMs: 30000,
    fallbackProvider: 'google',
    fallbackModel: 'gemini-1.5-flash'
  };

  private readonly SYSTEM_PROMPTS = {
    smart_home: `You are a helpful smart home assistant integrated with Home Assistant. You can control various devices, check their status, and provide information about energy usage, weather, and more. Always be clear about what actions you're taking and ask for confirmation before making significant changes to device settings.`,
    safety: `Before executing any device control functions, consider safety implications. For temperature changes, ensure they're within reasonable ranges. For security systems, verify the user's intent. Always provide feedback about what was done.`
  };

  private readonly DEVICE_FUNCTIONS: FunctionDefinition[] = [
    {
      name: 'control_thermostat',
      description: 'Control the thermostat temperature and mode',
      parameters: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            description: 'Target temperature in Fahrenheit (60-85)',
            minimum: 60,
            maximum: 85
          },
          mode: {
            type: 'string',
            enum: ['heat', 'cool', 'auto', 'off'],
            description: 'Thermostat mode'
          },
          entity_id: {
            type: 'string',
            description: 'Home Assistant entity ID of the thermostat'
          }
        },
        required: ['temperature', 'mode', 'entity_id']
      }
    },
    {
      name: 'control_alarm',
      description: 'Control the alarm system',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['arm_home', 'arm_away', 'disarm'],
            description: 'Alarm system action'
          },
          code: {
            type: 'string',
            description: 'Security code (required for disarming)'
          },
          entity_id: {
            type: 'string',
            description: 'Home Assistant entity ID of the alarm system'
          }
        },
        required: ['action', 'entity_id']
      }
    },
    {
      name: 'get_device_status',
      description: 'Get the current status of a device',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'Home Assistant entity ID of the device'
          },
          device_type: {
            type: 'string',
            enum: ['light', 'switch', 'sensor', 'climate', 'alarm', 'lock'],
            description: 'Type of device'
          }
        },
        required: ['entity_id']
      }
    },
    {
      name: 'get_energy_usage',
      description: 'Get energy usage information for devices or the whole home',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            description: 'Time period for energy data'
          },
          entity_id: {
            type: 'string',
            description: 'Specific device entity ID (optional, omit for whole home)'
          }
        },
        required: ['period']
      }
    },
    {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return (1-10)',
            minimum: 1,
            maximum: 10,
            default: 5
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_weather',
      description: 'Get current weather information or forecast',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Location (city, state or coordinates)'
          },
          type: {
            type: 'string',
            enum: ['current', 'forecast', 'alerts'],
            description: 'Type of weather information'
          },
          days: {
            type: 'number',
            description: 'Number of forecast days (for forecast type)',
            minimum: 1,
            maximum: 7,
            default: 3
          }
        },
        required: ['location', 'type']
      }
    }
  ];

  private readonly MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
    'gpt-4o': {
      maxTokens: 128000,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 128000,
      costPer1kTokens: { input: 0.005, output: 0.015 }
    },
    'gpt-4o-mini': {
      maxTokens: 128000,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 128000,
      costPer1kTokens: { input: 0.00015, output: 0.0006 }
    },
    'gpt-3.5-turbo': {
      maxTokens: 4096,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 16385,
      costPer1kTokens: { input: 0.001, output: 0.002 }
    },
    'claude-3-5-sonnet-20241022': {
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 200000,
      costPer1kTokens: { input: 0.003, output: 0.015 }
    },
    'claude-3-5-haiku-20241022': {
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 200000,
      costPer1kTokens: { input: 0.001, output: 0.005 }
    },
    'gemini-1.5-pro': {
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 2000000,
      costPer1kTokens: { input: 0.0035, output: 0.0105 }
    },
    'gemini-1.5-flash': {
      maxTokens: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      contextWindow: 1000000,
      costPer1kTokens: { input: 0.00035, output: 0.00105 }
    }
  };

  private constructor() {
    this.config = {
      provider: this.currentProvider,
      model: this.currentModel,
      temperature: 0.7,
      maxTokens: 2048,
      stream: false,
      functions: [],
      systemPrompt: this.SYSTEM_PROMPTS.smart_home
    };

    this.initializeProviders();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private initializeProviders(): void {
    // Initialize Ollama (always available locally)
    // No API key needed for Ollama
    
    // Initialize paid providers only if API keys are available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.credentials.openai = {
        apiKey: process.env.OPENAI_API_KEY
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.credentials.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY
      };
    }

    if (process.env.GOOGLE_API_KEY) {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      this.credentials.google = {
        apiKey: process.env.GOOGLE_API_KEY
      };
    }
    
    // Initialize rate limits
    this.initializeRateLimits();
  }

  private async getAvailableLocalModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (!response.ok) {
        console.warn('Ollama not available, install it from https://ollama.ai');
        return [];
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.warn('Ollama not running on localhost:11434');
      return [];
    }
  }

  private async downloadModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to download model:', error);
      return false;
    }
  }

  private async generateOllamaResponse(
    messages: ChatMessage[],
    functions?: FunctionDefinition[],
    config?: LLMConfig
  ): Promise<LLMResponse> {
    const finalConfig = config || this.config;
    
    // Convert messages to Ollama format
    const prompt = this.formatMessagesForOllama(messages, functions);
    
    const requestBody = {
      model: finalConfig.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: finalConfig.temperature,
        num_predict: finalConfig.maxTokens,
        stop: functions ? ['</function_call>'] : undefined
      }
    };

    const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(finalConfig.timeoutMs || 30000)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    
    // Parse function calls if enabled
    let functionCall: FunctionCall | undefined;
    let content = data.response;
    
    if (functions && finalConfig.enableFunctionCalling) {
      const functionCallMatch = content.match(/<function_call name="([^"]+)">\s*({[^}]*})\s*<\/function_call>/);
      if (functionCallMatch) {
        try {
          functionCall = {
            name: functionCallMatch[1],
            arguments: JSON.parse(functionCallMatch[2])
          };
          content = content.replace(functionCallMatch[0], '').trim();
        } catch (error) {
          console.warn('Failed to parse function call:', error);
        }
      }
    }

    return {
      content,
      functionCall,
      tokenUsage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      model: data.model,
      provider: 'ollama'
    };
  }

  private formatMessagesForOllama(messages: ChatMessage[], functions?: FunctionDefinition[]): string {
    let prompt = '';
    
    // Add system message if functions are available
    if (functions && functions.length > 0) {
      prompt += 'You are a helpful assistant that can call functions. ';
      prompt += 'Available functions:\n';
      functions.forEach(func => {
        prompt += `- ${func.name}: ${func.description}\n`;
        prompt += `  Parameters: ${JSON.stringify(func.parameters)}\n`;
      });
      prompt += '\nTo call a function, use this format: <function_call name="function_name">{"param": "value"}</function_call>\n\n';
    }
    
    // Add conversation messages
    messages.forEach(message => {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    });
    
    prompt += 'Assistant: ';
    return prompt;
  }

  private initializeRateLimits(): void {
    const now = Date.now();
    this.rateLimits = {
      openai: { requests: 0, tokens: 0, resetTime: now + 60000 },
      anthropic: { requests: 0, tokens: 0, resetTime: now + 60000 },
      google: { requests: 0, tokens: 0, resetTime: now + 60000 }
    };
  }

  private checkRateLimit(provider: LLMProvider): boolean {
    const limit = this.rateLimits[provider];
    const now = Date.now();

    if (now > limit.resetTime) {
      limit.requests = 0;
      limit.tokens = 0;
      limit.resetTime = now + 60000;
    }

    const maxRequests = provider === 'openai' ? 500 : provider === 'anthropic' ? 100 : 300;
    return limit.requests < maxRequests;
  }

  private updateRateLimit(provider: LLMProvider, tokens: number): void {
    const limit = this.rateLimits[provider];
    limit.requests++;
    limit.tokens += tokens;
  }

  private selectOptimalModel(messages: ChatMessage[], requiresFunctions: boolean = false): { provider: LLMProvider; model: LLMModel } {
    const complexity = this.assessComplexity(messages);
    const tokenEstimate = this.estimateTokenUsage(messages);

    // High complexity or large context - use most capable models
    if (complexity === 'high' || tokenEstimate.total > 50000) {
      if (this.checkRateLimit('anthropic')) {
        return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };
      }
      if (this.checkRateLimit('google')) {
        return { provider: 'google', model: 'gemini-1.5-pro' };
      }
      return { provider: 'openai', model: 'gpt-4o' };
    }

    // Medium complexity - balanced models
    if (complexity === 'medium') {
      if (this.checkRateLimit('anthropic')) {
        return { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };
      }
      if (this.checkRateLimit('google')) {
        return { provider: 'google', model: 'gemini-1.5-flash' };
      }
      return { provider: 'openai', model: 'gpt-4o-mini' };
    }

    // Simple tasks - fastest/cheapest models
    if (this.checkRateLimit('google')) {
      return { provider: 'google', model: 'gemini-1.5-flash' };
    }
    if (this.checkRateLimit('openai')) {
      return { provider: 'openai', model: 'gpt-3.5-turbo' };
    }
    return { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };
  }

  private assessComplexity(messages: ChatMessage[]): 'low' | 'medium' | 'high' {
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const hasCode = messages.some(msg => /|`[^`]+`/.test(msg.content));
    const hasComplexQuestions = messages.some(msg => 
      /\b(analyze|explain|compare|contrast|evaluate|synthesize)\b/i.test(msg.content)
    );

    if (totalLength > 5000 || hasCode || hasComplexQuestions) return 'high';
    if (totalLength > 1500) return 'medium';
    return 'low';
  }

  public async generateResponse(
    messages: ChatMessage[], 
    functions?: FunctionDefinition[], 
    streaming: boolean = false,
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const finalConfig = { ...this.config, ...config };
    const allFunctions = functions || [];
    
    try {
      // Try local Ollama first
      if (finalConfig.provider === 'ollama') {
        return await this.generateOllamaResponse(messages, functions, finalConfig);
      }
      
      // Auto-select optimal model if not specified
      if (!config?.provider || !config?.model) {
        const optimal = this.selectOptimalModel(messages, allFunctions.length > 0);
        finalConfig.provider = optimal.provider;
        finalConfig.model = optimal.model;
      }

      let lastError: Error | null = null;
      const providers: LLMProvider[] = ['openai', 'anthropic', 'google'];
      
      // Try current provider first, then fallback to others
      const providerOrder = [finalConfig.provider!, ...providers.filter(p => p !== finalConfig.provider)];

      for (const provider of providerOrder) {
        try {
          if (!this.checkRateLimit(provider)) {
            continue; // Skip if rate limited
          }

          const response = await this.callProvider(provider, messages, allFunctions, finalConfig);
          this.updateRateLimit(provider, response.usage.totalTokens);
          
          // Update current provider on success
          this.currentProvider = provider;
          return {
            content: response.content,
            functionCall: response.functionCalls?.[0], // Take first function call if any
            tokenUsage: response.usage,
            model: response.model,
            provider: response.provider
          };
        } catch (error) {
          lastError = error as Error;
          console.warn(`Provider ${provider} failed:`, error);
          await this.sleep(this.retryDelay);
        }
      }

      throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    } catch (error) {
      console.error(`LLM request failed with ${finalConfig.provider}:`, error);
      
      // Fallback to local Ollama
      if (finalConfig.provider !== 'ollama') {
        console.log('Falling back to local Ollama model...');
        return await this.generateOllamaResponse(messages, functions, finalConfig);
      }
      
      throw error;
    }
  }

  private async callProvider(
    provider: LLMProvider,
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    config: LLMConfig
  ): Promise<BaseLLMResponse> {
    const systemMessage = config.systemPrompt ? [{ role: 'system' as const, content: config.systemPrompt }] : [];
    const allMessages = [...systemMessage, ...messages];

    switch (provider) {
      case 'openai':
        return this.callOpenAI(allMessages, functions, config);
      case 'anthropic':
        return this.callAnthropic(allMessages, functions, config);
      case 'google':
        return this.callGoogle(allMessages, functions, config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async callOpenAI(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    config: LLMConfig
  ): Promise<BaseLLMResponse> {
    const { apiKey, baseURL } = this.credentials.openai!;
    
    const payload: any = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: config.stream
    };

    if (functions.length > 0) {
      payload.tools = functions.map(fn => ({
        type: 'function',
        function: fn
      }));
      payload.tool_choice = 'auto';
    }

    const response = await fetch(`${baseURL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content || '',
      functionCalls: data.choices[0].message.tool_calls?.map((call: any) => ({
        id: call.id,
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments)
      })) || [],
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: config.model!,
      provider: 'openai',
      finishReason: data.choices[0].finish_reason
    };
  }

  private async callAnthropic(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    config: LLMConfig
  ): Promise<BaseLLMResponse> {
    const { apiKey, baseURL } = this.credentials.anthropic!;
    
    // Separate system message from conversation
    const systemContent = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const payload: any = {
      model: config.model,
      messages: conversationMessages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemContent
    };

    if (functions.length > 0) {
      payload.tools = functions;
    }

    const response = await fetch(`${baseURL || 'https://api.anthropic.com/v1'}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const content = data.content.find((c: any) => c.type === 'text')?.text || '';
    const functionCalls = data.content
      .filter((c: any) => c.type === 'tool_use')
      .map((call: any) => ({
        id: call.id,
        name: call.name,
        arguments: call.input
      }));

    return {
      content,
      functionCalls,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: config.model!,
      provider: 'anthropic',
      finishReason: data.stop_reason
    };
  }

  private async callGoogle(
    messages: ChatMessage[],
    functions: FunctionDefinition[],
    config: LLMConfig
  ): Promise<BaseLLMResponse> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key not configured');
    }

    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system') // System messages handled separately
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add system message as first user message if exists
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: `System instructions: ${systemMessage.content}` }]
      });
    }

    const payload: any = {
      contents,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens
      }
    };

    if (functions.length > 0) {
      payload.tools = [{
        function_declarations: functions.map(fn => ({
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }))
      }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Google API');
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts.find((p: any) => p.text)?.text || '';
    const functionCalls = candidate.content.parts
      .filter((p: any) => p.functionCall)
      .map((call: any, index: number) => ({
        id: `call_${index}`,
        name: call.functionCall.name,
        arguments: call.functionCall.args
      }));

    return {
      content,
      functionCalls,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model: config.model!,
      provider: 'google',
      finishReason: candidate.finishReason
    };
  }

  public async executeFunction(functionCall: FunctionCall): Promise<any> {
    if (!this.validateFunctionCall(functionCall)) {
      throw new Error(`Invalid function call: ${functionCall.name}`);
    }

    try {
      switch (functionCall.name) {
        case 'control_thermostat':
          return await this.controlThermostat(functionCall.arguments);
        case 'control_alarm':
          return await this.controlAlarm(functionCall.arguments);
        case 'get_device_status':
          return await this.getDeviceStatus(functionCall.arguments);
        case 'get_energy_usage':
          return await this.getEnergyUsage(functionCall.arguments);
        case 'web_search':
          return await this.performWebSearch(functionCall.arguments);
        case 'get_weather':
          return await this.getWeather(functionCall.arguments);
        default:
          throw new Error(`Unknown function: ${functionCall.name}`);
      }
    } catch (error) {
      console.error(`Function execution failed: ${functionCall.name}`, error);
      throw error;
    }
  }

  private async controlThermostat(args: any): Promise<any> {
    const { temperature, mode, entity_id } = args;
    
    // Safety checks
    if (temperature < 60 || temperature > 85) {
      throw new Error('Temperature must be between 60-85°F for safety');
    }

    const response = await fetch('/api/home-assistant/services/climate/set_temperature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id,
        temperature,
        hvac_mode: mode
      })
    });

    if (!response.ok) {
      throw new Error('Failed to control thermostat');
    }

    return {
      success: true,
      message: `Thermostat set to ${temperature}°F in ${mode} mode`,
      entity_id,
      temperature,
      mode
    };
  }

  private async controlAlarm(args: any): Promise<any> {
    const { action, code, entity_id } = args;
    
    if (action === 'disarm' && !code) {
      throw new Error('Security code required to disarm alarm');
    }

    const response = await fetch('/api/home-assistant/services/alarm_control_panel/alarm_' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_id,
        ...(code && { code })
      })
    });

    if (!response.ok) {
      throw new Error('Failed to control alarm system');
    }

    return {
      success: true,
      message: `Alarm system ${action.replace('_', ' ')}`,
      entity_id,
      action
    };
  }

  private async getDeviceStatus(args: any): Promise<any> {
    const { entity_id } = args;
    
    const response = await fetch(`/api/home-assistant/states/${entity_id}`);
    
    if (!response.ok) {
      throw new Error('Failed to get device status');
    }

    const data = await response.json();
    return {
      entity_id,
      state: data.state,
      attributes: data.attributes,
      last_changed: data.last_changed,
      last_updated: data.last_updated
    };
  }

  private async getEnergyUsage(args: any): Promise<any> {
    const { period, entity_id } = args;
    
    const params = new URLSearchParams({ period });
    if (entity_id) params.append('entity_id', entity_id);
    
    const response = await fetch(`/api/home-assistant/energy?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to get energy usage');
    }

    return await response.json();
  }

  private async performWebSearch(args: any): Promise<any> {
    const { query, num_results = 5 } = args;
    
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, num_results })
    });
    
    if (!response.ok) {
      throw new Error('Web search failed');
    }

    return await response.json();
  }

  private async getWeather(args: any): Promise<any> {
    const { location, type, days = 3 } = args;
    
    const response = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, type, days })
    });
    
    if (!response.ok) {
      throw new Error('Weather request failed');
    }

    return await response.json();
  }

  public switchProvider(provider: LLMProvider, model?: LLMModel): void {
    this.currentProvider = provider;
    this.config.provider = provider;
    
    if (model) {
      this.currentModel = model;
      this.config.model = model;
    } else {
      // Set default model for provider
      const defaultModels: Record<LLMProvider, LLMModel> = {
        openai: 'gpt-4o',
        anthropic: 'claude-3-5-sonnet-20241022',
        google: 'gemini-1.5-pro'
      };
      this.currentModel = defaultModels[provider];
      this.config.model = this.currentModel;
    }
  }

  public getAvailableModels(): Record<LLMProvider, LLMModel[]> {
    return {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
      google: ['gemini-1.5-pro', 'gemini-1.5-flash']
    };
  }

  public getConversationContext(id: string): ConversationContext | null {
    return this.conversations[id] || null;
  }

  public saveConversationContext(context: ConversationContext): void {
    this.conversations[context.id] = {
      ...context,
      lastUpdated: new Date().toISOString()
    };
  }

  public validateFunctionCall(call: FunctionCall): boolean {
    const functionDef = this.DEVICE_FUNCTIONS.find(f => f.name === call.name);
    if (!functionDef) return false;

    // Basic validation - could be enhanced with JSON schema validation
    const required = functionDef.parameters.required || [];
    return required.every(field => field in call.arguments);
  }

  public handleProviderError(error: Error, provider: LLMProvider): LLMError {
    const llmError: LLMError = {
      code: 'PROVIDER_ERROR',
      message: error.message,
      provider,
      retryable: true
    };

    // Categorize common errors
    if (error.message.includes('rate limit')) {
      llmError.code = 'RATE_LIMIT_EXCEEDED';
      llmError.retryAfter = 60;
    } else if (error.message.includes('authentication') || error.message.includes('401')) {
      llmError.code = 'AUTHENTICATION_ERROR';
      llmError.retryable = false;
    } else if (error.message.includes('quota') || error.message.includes('billing')) {
      llmError.code = 'QUOTA_EXCEEDED';
      llmError.retryable = false;
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      llmError.code = 'NETWORK_ERROR';
    }

    return llmError;
  }

  public estimateTokenUsage(messages: ChatMessage[]): TokenUsage {
    // Rough estimation: ~4 characters per token for English
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimated = Math.ceil(totalChars / 4);
    
    return {
      promptTokens: estimated,
      completionTokens: 0, // Can't estimate without response
      totalTokens: estimated
    };
  }

  public getModelCapabilities(model: LLMModel): ModelCapabilities | null {
    return this.MODEL_CAPABILITIES[model] || null;
  }

  public updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getCurrentProvider(): LLMProvider {
    return this.currentProvider;
  }

  public getCurrentModel(): LLMModel {
    return this.currentModel;
  }

  public getRateLimitStatus(): ProviderRateLimits {
    return { ...this.rateLimits };
  }

  public clearConversationMemory(): void {
    this.conversations = {};
  }

  public getConversationHistory(): ConversationMemory {
    return { ...this.conversations };
  }
}

export default LLMService.getInstance();