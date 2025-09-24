import { NextRequest, NextResponse } from 'next/server';
import LLMService from '@/lib/llm-service';
import { ChatMessage, FunctionDefinition, LLMConfig } from '@/lib/llm-types';

// Request/Response interfaces
interface LLMRequestBody {
  messages: ChatMessage[];
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  model: string;
  functions?: FunctionDefinition[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  success: boolean;
  data?: {
    content: string;
    functionCall?: {
      name: string;
      arguments: any;
    };
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    provider: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Environment variable validation
function validateEnvironmentVariables(provider: string): { valid: boolean; missing?: string } {
  const envVars = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    ollama: null // Local, no API key needed
  };

  const requiredVar = envVars[provider as keyof typeof envVars];
  
  if (requiredVar && !process.env[requiredVar]) {
    return { valid: false, missing: requiredVar };
  }
  
  return { valid: true };
}

// Request validation
function validateRequestBody(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: 'Messages array is required and cannot be empty' };
  }

  if (!body.provider || !['openai', 'anthropic', 'google', 'ollama'].includes(body.provider)) {
    return { valid: false, error: 'Provider must be one of: openai, anthropic, google, ollama' };
  }

  if (!body.model || typeof body.model !== 'string') {
    return { valid: false, error: 'Model is required' };
  }

  return { valid: true };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let requestBody: LLMRequestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        }
      }, { status: 400 });
    }

    // Validate request
    const bodyValidation = validateRequestBody(requestBody);
    if (!bodyValidation.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: bodyValidation.error
        }
      }, { status: 400 });
    }

    // Validate environment variables
    const envValidation = validateEnvironmentVariables(requestBody.provider);
    if (!envValidation.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: `Missing environment variable: ${envValidation.missing}. Please add it to your .env file.`
        }
      }, { status: 500 });
    }

    // Configure LLM service
    const config: Partial<LLMConfig> = {
      provider: requestBody.provider as any,
      model: requestBody.model as any,
      temperature: requestBody.temperature || 0.7,
      maxTokens: requestBody.maxTokens || 2048,
      stream: requestBody.stream || false
    };

    LLMService.updateConfig(config);

    // Log request
    console.log('LLM API Request:', {
      provider: requestBody.provider,
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      timestamp: new Date().toISOString()
    });

    // Generate response
    const result = await LLMService.generateResponse(
      requestBody.messages,
      requestBody.functions || [],
      requestBody.stream || false,
      config
    );

    const response: LLMResponse = {
      success: true,
      data: {
        content: result.content,
        functionCall: result.functionCall,
        usage: result.tokenUsage,
        model: requestBody.model,
        provider: requestBody.provider,
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('LLM API Error:', error);
    
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
        statusCode = 429;
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorCode = 'AUTHENTICATION_ERROR';
        statusCode = 401;
      } else if (error.message.includes('model')) {
        errorCode = 'INVALID_MODEL';
        statusCode = 400;
      } else if (error.message.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
        statusCode = 408;
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }, { 
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are allowed'
    }
  }, { status: 405 });
}