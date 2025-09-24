import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_TRIGGER_TYPES = ['entity_state', 'time', 'sunrise_sunset', 'mqtt', 'zwave'];

// Validate HH:MM time format
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string, triggerId: string } }) {
  try {
    const { id, triggerId } = params;
    
    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    if (!triggerId || isNaN(parseInt(triggerId))) {
      return NextResponse.json({ 
        error: "Valid trigger ID is required",
        code: "INVALID_TRIGGER_ID" 
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const triggerIdInt = parseInt(triggerId);

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Verify trigger exists and belongs to automation
    const existingTrigger = await db.select()
      .from(automationTriggers)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .limit(1);

    if (existingTrigger.length === 0) {
      return NextResponse.json({ 
        error: 'Trigger not found or does not belong to this automation',
        code: 'TRIGGER_NOT_FOUND' 
      }, { status: 404 });
    }

    const requestBody = await request.json();

    // Extract and validate fields
    const { type, entityId, attribute, state, time, offset, topic, payload } = requestBody;

    // Validate type if provided
    if (type && !VALID_TRIGGER_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`,
        code: "INVALID_TRIGGER_TYPE" 
      }, { status: 400 });
    }

    // Validate time format if provided
    if (time && !isValidTimeFormat(time)) {
      return NextResponse.json({ 
        error: "Invalid time format. Must be HH:MM",
        code: "INVALID_TIME_FORMAT" 
      }, { status: 400 });
    }

    // Validate offset is integer if provided
    if (offset !== undefined && (!Number.isInteger(offset))) {
      return NextResponse.json({ 
        error: "Offset must be an integer",
        code: "INVALID_OFFSET" 
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (type !== undefined) updateData.type = type;
    if (entityId !== undefined) updateData.entityId = entityId;
    if (attribute !== undefined) updateData.attribute = attribute;
    if (state !== undefined) updateData.state = state;
    if (time !== undefined) updateData.time = time;
    if (offset !== undefined) updateData.offset = offset;
    if (topic !== undefined) updateData.topic = topic;
    if (payload !== undefined) updateData.payload = payload;

    // Update trigger
    const updated = await db.update(automationTriggers)
      .set(updateData)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update trigger',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT trigger error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string, triggerId: string } }) {
  try {
    const { id, triggerId } = params;
    
    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    if (!triggerId || isNaN(parseInt(triggerId))) {
      return NextResponse.json({ 
        error: "Valid trigger ID is required",
        code: "INVALID_TRIGGER_ID" 
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const triggerIdInt = parseInt(triggerId);

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Verify trigger exists and belongs to automation
    const existingTrigger = await db.select()
      .from(automationTriggers)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .limit(1);

    if (existingTrigger.length === 0) {
      return NextResponse.json({ 
        error: 'Trigger not found or does not belong to this automation',
        code: 'TRIGGER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete trigger
    const deleted = await db.delete(automationTriggers)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete trigger',
        code: 'DELETE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Trigger deleted successfully",
      deletedTrigger: deleted[0]
    });

  } catch (error) {
    console.error('DELETE trigger error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}