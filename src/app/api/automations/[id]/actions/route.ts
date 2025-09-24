import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automationActions, automations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_ACTION_TYPES = ['service_call', 'mqtt', 'scene', 'local_device'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = parseInt(params.id);
    
    if (!automationId || isNaN(automationId)) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Get all actions for this automation
    const actions = await db.select()
      .from(automationActions)
      .where(eq(automationActions.automationId, automationId));

    return NextResponse.json(actions);

  } catch (error) {
    console.error('GET automation actions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = parseInt(params.id);
    
    if (!automationId || isNaN(automationId)) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const { type, service, entityId, data, topic, payload, sceneId } = requestBody;

    // Validate required type field
    if (!type) {
      return NextResponse.json({ 
        error: "Action type is required",
        code: "MISSING_TYPE" 
      }, { status: 400 });
    }

    if (!VALID_ACTION_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid action type. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
        code: "INVALID_ACTION_TYPE" 
      }, { status: 400 });
    }

    // Type-specific validation
    if (type === 'service_call') {
      if (!service) {
        return NextResponse.json({ 
          error: "Service is required for service_call actions",
          code: "MISSING_SERVICE" 
        }, { status: 400 });
      }
      if (!entityId) {
        return NextResponse.json({ 
          error: "Entity ID is required for service_call actions",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'mqtt') {
      if (!topic) {
        return NextResponse.json({ 
          error: "Topic is required for mqtt actions",
          code: "MISSING_TOPIC" 
        }, { status: 400 });
      }
    }

    if (type === 'scene') {
      if (!sceneId) {
        return NextResponse.json({ 
          error: "Scene ID is required for scene actions",
          code: "MISSING_SCENE_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'local_device') {
      if (!entityId) {
        return NextResponse.json({ 
          error: "Entity ID is required for local_device actions",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    // Validate data field as JSON if provided
    let validatedData = null;
    if (data !== undefined && data !== null) {
      try {
        // If data is already an object, keep it as is
        // If it's a string, try to parse it
        if (typeof data === 'string') {
          validatedData = JSON.parse(data);
        } else if (typeof data === 'object') {
          validatedData = data;
        } else {
          throw new Error('Data must be a JSON object or valid JSON string');
        }
      } catch (error) {
        return NextResponse.json({ 
          error: "Invalid JSON format in data field",
          code: "INVALID_JSON_DATA" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData = {
      automationId,
      type,
      service: service || null,
      entityId: entityId || null,
      data: validatedData,
      topic: topic || null,
      payload: payload || null,
      sceneId: sceneId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert new action
    const newAction = await db.insert(automationActions)
      .values(insertData)
      .returning();

    return NextResponse.json(newAction[0], { status: 201 });

  } catch (error) {
    console.error('POST automation action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}