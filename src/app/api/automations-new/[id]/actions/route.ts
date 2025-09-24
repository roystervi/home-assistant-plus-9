import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationActions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = parseInt(params.id);
    
    if (!automationId || isNaN(automationId)) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if automation exists
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
    console.error('GET error:', error);
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
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if automation exists
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

    // Validate required fields
    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate type is one of allowed values
    const allowedTypes = ['service_call', 'mqtt', 'scene', 'local_device'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ 
        error: "Invalid action type. Must be one of: " + allowedTypes.join(', '),
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Type-specific validation
    if (type === 'service_call') {
      if (!service) {
        return NextResponse.json({ 
          error: "Service is required for service_call type",
          code: "MISSING_SERVICE" 
        }, { status: 400 });
      }
      if (!entityId) {
        return NextResponse.json({ 
          error: "Entity ID is required for service_call type",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'mqtt') {
      if (!topic) {
        return NextResponse.json({ 
          error: "Topic is required for mqtt type",
          code: "MISSING_TOPIC" 
        }, { status: 400 });
      }
    }

    if (type === 'scene') {
      if (!sceneId) {
        return NextResponse.json({ 
          error: "Scene ID is required for scene type",
          code: "MISSING_SCENE_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'local_device') {
      if (!entityId) {
        return NextResponse.json({ 
          error: "Entity ID is required for local_device type",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    // Validate JSON data field if provided
    let validatedData = data;
    if (data && typeof data === 'string') {
      try {
        validatedData = JSON.parse(data);
      } catch (e) {
        return NextResponse.json({ 
          error: "Invalid JSON format in data field",
          code: "INVALID_JSON" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData = {
      automationId,
      type,
      service: service || null,
      entityId: entityId || null,
      data: validatedData || null,
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
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}