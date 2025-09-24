import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  url: string;
  token: string;
  timeout?: number;
}

interface HomeAssistantResponse {
  message: string;
  version?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format in request body'
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Validate required parameters
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid url parameter'
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid token parameter'
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Set default timeout and validate
    const timeout = body.timeout && typeof body.timeout === 'number' ? body.timeout : 5000;
    
    if (timeout <= 0 || timeout > 30000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Timeout must be between 1 and 30000 milliseconds'
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Normalize URL (remove trailing slash)
    const normalizedUrl = body.url.replace(/\/$/, '');
    const apiUrl = `${normalizedUrl}/api/`;

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Make request to Home Assistant API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${body.token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        console.error('Home Assistant authentication failed:', response.statusText);
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed. Please check your Home Assistant token.'
          },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        console.error(`Home Assistant API error: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          {
            success: false,
            error: `Home Assistant API returned ${response.status}: ${response.statusText}`
          },
          { 
            status: 503,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      // Parse response
      let homeAssistantData: HomeAssistantResponse;
      try {
        homeAssistantData = await response.json();
      } catch (error) {
        console.error('Failed to parse Home Assistant response:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid response format from Home Assistant'
          },
          { 
            status: 503,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      // Success response
      return NextResponse.json(
        {
          success: true,
          message: 'Connected to Home Assistant successfully',
          data: {
            message: homeAssistantData.message || 'API running.',
            ...(homeAssistantData.version && { version: homeAssistantData.version })
          }
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );

    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (error.name === 'AbortError') {
        console.error('Home Assistant connection timeout:', error);
        return NextResponse.json(
          {
            success: false,
            error: `Connection timeout after ${timeout}ms. Please check your Home Assistant URL and network connection.`
          },
          { 
            status: 408,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('fetch')) {
        console.error('Home Assistant network error:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to connect to Home Assistant. Please check the URL and ensure Home Assistant is accessible.'
          },
          { 
            status: 503,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          }
        );
      }

      // Handle other errors
      console.error('Unexpected error testing Home Assistant connection:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'An unexpected error occurred while testing the connection'
        },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

  } catch (error) {
    console.error('General error in Home Assistant test endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. This endpoint only supports POST requests.'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. This endpoint only supports POST requests.'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. This endpoint only supports POST requests.'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}