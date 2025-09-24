import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers } from '@/db/schema';
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
        error: "Automation not found",
        code: "AUTOMATION_NOT_FOUND"
      }, { status: 404 });
    }

    // Get all triggers for this automation
    const triggers = await db.select()
      .from(automationTriggers)
      .where(eq(automationTriggers.automationId, automationId));

    return NextResponse.json(triggers);

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

    const requestBody = await request.json();
    const { type, entityId, attribute, state, time, offset, topic, payload } = requestBody;

    // Validate required fields
    if (!type) {
      return NextResponse.json({
        error: "Trigger type is required",
        code: "MISSING_TYPE"
      }, { status: 400 });
    }

    // Validate trigger types
    const validTypes = ['entity_state', 'time', 'sunrise_sunset', 'mqtt', 'zwave'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: "Invalid trigger type. Valid types: " + validTypes.join(', '),
        code: "INVALID_TYPE"
      }, { status: 400 });
    }

    // Type-specific validation
    if (type === 'entity_state' && !entityId) {
      return NextResponse.json({
        error: "Entity ID is required for entity_state triggers",
        code: "MISSING_ENTITY_ID"
      }, { status: 400 });
    }

    if (type === 'time' && !time) {
      return NextResponse.json({
        error: "Time is required for time triggers",
        code: "MISSING_TIME"
      }, { status: 400 });
    }

    if (type === 'time' && time && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return NextResponse.json({
        error: "Time must be in HH:MM format",
        code: "INVALID_TIME_FORMAT"
      }, { status: 400 });
    }

    if (type === 'mqtt' && !topic) {
      return NextResponse.json({
        error: "Topic is required for MQTT triggers",
        code: "MISSING_TOPIC"
      }, { status: 400 });
    }

    if (type === 'zwave' && !entityId) {
      return NextResponse.json({
        error: "Entity ID is required for Z-Wave triggers",
        code: "MISSING_ENTITY_ID"
      }, { status: 400 });
    }

    if (type === 'sunrise_sunset' && offset !== undefined && (isNaN(parseInt(offset.toString())) || Math.abs(parseInt(offset.toString())) > 1440)) {
      return NextResponse.json({
        error: "Offset must be a valid integer between -1440 and 1440 minutes",
        code: "INVALID_OFFSET"
      }, { status: 400 });
    }

    // Check if automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({
        error: "Automation not found",
        code: "AUTOMATION_NOT_FOUND"
      }, { status: 404 });
    }

    // Prepare trigger data
    const triggerData: any = {
      automationId,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add optional fields based on type
    if (entityId) triggerData.entityId = entityId.toString().trim();
    if (attribute) triggerData.attribute = attribute.toString().trim();
    if (state) triggerData.state = state.toString().trim();
    if (time) triggerData.time = time.toString().trim();
    if (offset !== undefined) triggerData.offset = parseInt(offset.toString());
    if (topic) triggerData.topic = topic.toString().trim();
    if (payload) triggerData.payload = payload.toString().trim();

    // Insert new trigger
    const newTrigger = await db.insert(automationTriggers)
      .values(triggerData)
      .returning();

    return NextResponse.json(newTrigger[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}