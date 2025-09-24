import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automationTriggers, automations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_TRIGGER_TYPES = ['entity_state', 'time', 'sunrise_sunset', 'mqtt', 'zwave'] as const;
const TIME_FORMAT_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = params.id;

    if (!automationId || isNaN(parseInt(automationId))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(automationId)))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Get all triggers for this automation
    const triggers = await db.select()
      .from(automationTriggers)
      .where(eq(automationTriggers.automationId, parseInt(automationId)));

    return NextResponse.json(triggers, { status: 200 });

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
    const automationId = params.id;

    if (!automationId || isNaN(parseInt(automationId))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(automationId)))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const { 
      type, 
      entityId, 
      attribute, 
      state, 
      time, 
      offset, 
      topic, 
      payload 
    } = requestBody;

    // Validate required type field
    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_TYPE" 
      }, { status: 400 });
    }

    if (!VALID_TRIGGER_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: "Invalid trigger type. Must be one of: " + VALID_TRIGGER_TYPES.join(', '),
        code: "INVALID_TRIGGER_TYPE" 
      }, { status: 400 });
    }

    // Type-specific validation
    if (type === 'entity_state') {
      if (!entityId) {
        return NextResponse.json({ 
          error: "entityId is required for entity_state triggers",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'zwave') {
      if (!entityId) {
        return NextResponse.json({ 
          error: "entityId is required for zwave triggers",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    if (type === 'time') {
      if (!time) {
        return NextResponse.json({ 
          error: "time is required for time triggers",
          code: "MISSING_TIME" 
        }, { status: 400 });
      }

      if (!TIME_FORMAT_REGEX.test(time)) {
        return NextResponse.json({ 
          error: "time must be in HH:MM format (24-hour)",
          code: "INVALID_TIME_FORMAT" 
        }, { status: 400 });
      }
    }

    if (type === 'mqtt') {
      if (!topic) {
        return NextResponse.json({ 
          error: "topic is required for mqtt triggers",
          code: "MISSING_TOPIC" 
        }, { status: 400 });
      }
    }

    // Prepare insert data with auto-generated fields
    const insertData = {
      automationId: parseInt(automationId),
      type,
      entityId: entityId || null,
      attribute: attribute || null,
      state: state || null,
      time: time || null,
      offset: offset !== undefined ? parseInt(offset) : (type === 'sunrise_sunset' ? 0 : null),
      topic: topic || null,
      payload: payload || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create the trigger
    const newTrigger = await db.insert(automationTriggers)
      .values(insertData)
      .returning();

    return NextResponse.json(newTrigger[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}