import { HomeAssistantAPI } from '@/lib/homeassistant'
import { NextRequest, NextResponse } from 'next/server'

interface AlarmRequest {
  entity_id: string
  service: string
  code?: string
}

interface AlarmServiceData {
  entity_id: string
  code?: string
}

const VALID_ALARM_SERVICES = [
  'alarm_arm_home',
  'alarm_arm_away',
  'alarm_arm_night',
  'alarm_arm_vacation',
  'alarm_arm_custom_bypass',
  'alarm_disarm',
  'alarm_trigger'
] as const

type AlarmService = typeof VALID_ALARM_SERVICES[number]

function isValidAlarmService(service: string): service is AlarmService {
  return VALID_ALARM_SERVICES.includes(service as AlarmService)
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: AlarmRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.entity_id || typeof body.entity_id !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing or invalid entity_id parameter' 
        },
        { status: 400 }
      )
    }

    if (!body.service || typeof body.service !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing or invalid service parameter' 
        },
        { status: 400 }
      )
    }

    // Validate service name
    if (!isValidAlarmService(body.service)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid alarm service. Must be one of: ${VALID_ALARM_SERVICES.join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Validate entity_id format (should start with alarm_control_panel.)
    if (!body.entity_id.startsWith('alarm_control_panel.')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'entity_id must be an alarm_control_panel entity (should start with "alarm_control_panel.")' 
        },
        { status: 400 }
      )
    }

    // Validate code parameter if provided
    if (body.code !== undefined && typeof body.code !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'code parameter must be a string if provided' 
        },
        { status: 400 }
      )
    }

    // Initialize Home Assistant API
    const homeAssistant = new HomeAssistantAPI()

    // Prepare service data
    const serviceData: AlarmServiceData = {
      entity_id: body.entity_id
    }

    // Add code if provided (typically for disarm operations)
    if (body.code) {
      serviceData.code = body.code
    }

    try {
      // Call the alarm control panel service
      const response = await homeAssistant.callService(
        'alarm_control_panel',
        body.service,
        serviceData
      )

      // Check if the response indicates success
      if (response && typeof response === 'object') {
        return NextResponse.json({
          success: true,
          message: `Successfully executed ${body.service} on ${body.entity_id}`,
          data: response
        })
      } else {
        return NextResponse.json({
          success: true,
          message: `Successfully executed ${body.service} on ${body.entity_id}`
        })
      }

    } catch (homeAssistantError: any) {
      // Handle Home Assistant specific errors
      console.error('Home Assistant API error:', homeAssistantError)

      if (homeAssistantError.message?.includes('401') || homeAssistantError.message?.includes('Unauthorized')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication failed. Please check your Home Assistant access token.' 
          },
          { status: 401 }
        )
      }

      if (homeAssistantError.message?.includes('404') || homeAssistantError.message?.includes('Not Found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Entity not found. Please check that the alarm_control_panel entity exists in Home Assistant.' 
          },
          { status: 404 }
        )
      }

      if (homeAssistantError.message?.includes('400') || homeAssistantError.message?.includes('Bad Request')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request. This may be due to an incorrect PIN code or unsupported service for this entity.' 
          },
          { status: 400 }
        )
      }

      if (homeAssistantError.message?.includes('timeout') || homeAssistantError.message?.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Connection timeout. Please check your Home Assistant connection.' 
          },
          { status: 408 }
        )
      }

      // Generic Home Assistant error
      return NextResponse.json(
        { 
          success: false, 
          error: `Home Assistant error: ${homeAssistantError.message || 'Unknown error occurred'}` 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    // Handle unexpected errors
    console.error('Unexpected error in alarm control API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error occurred while processing alarm command' 
      },
      { status: 500 }
    )
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. This endpoint only accepts POST requests.' 
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. This endpoint only accepts POST requests.' 
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. This endpoint only accepts POST requests.' 
    },
    { status: 405 }
  )
}