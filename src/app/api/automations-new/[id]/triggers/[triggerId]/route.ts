import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automationTriggers, automations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest, 
  { params }: { params: { id: string; triggerId: string } }
) {
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
        code: "AUTOMATION_NOT_FOUND" 
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
        error: 'Trigger not found or does not belong to automation',
        code: "TRIGGER_NOT_FOUND" 
      }, { status: 404 });
    }

    const requestBody = await request.json();

    // Validate trigger type if provided
    if (requestBody.type && !['state', 'time', 'mqtt'].includes(requestBody.type)) {
      return NextResponse.json({ 
        error: "Invalid trigger type. Must be 'state', 'time', or 'mqtt'",
        code: "INVALID_TRIGGER_TYPE" 
      }, { status: 400 });
    }

    // Validate required fields based on type
    if (requestBody.type === 'state') {
      if (requestBody.entityId !== undefined && !requestBody.entityId.trim()) {
        return NextResponse.json({ 
          error: "Entity ID is required for state triggers",
          code: "MISSING_ENTITY_ID" 
        }, { status: 400 });
      }
    }

    if (requestBody.type === 'time') {
      if (requestBody.time !== undefined && !requestBody.time.trim()) {
        return NextResponse.json({ 
          error: "Time is required for time triggers",
          code: "MISSING_TIME" 
        }, { status: 400 });
      }
    }

    if (requestBody.type === 'mqtt') {
      if (requestBody.topic !== undefined && !requestBody.topic.trim()) {
        return NextResponse.json({ 
          error: "Topic is required for MQTT triggers",
          code: "MISSING_TOPIC" 
        }, { status: 400 });
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (requestBody.type !== undefined) updateData.type = requestBody.type.trim();
    if (requestBody.entityId !== undefined) updateData.entityId = requestBody.entityId.trim();
    if (requestBody.attribute !== undefined) updateData.attribute = requestBody.attribute.trim();
    if (requestBody.state !== undefined) updateData.state = requestBody.state.trim();
    if (requestBody.time !== undefined) updateData.time = requestBody.time.trim();
    if (requestBody.offset !== undefined) updateData.offset = parseInt(requestBody.offset) || 0;
    if (requestBody.topic !== undefined) updateData.topic = requestBody.topic.trim();
    if (requestBody.payload !== undefined) updateData.payload = requestBody.payload.trim();

    // Update trigger
    const updatedTrigger = await db.update(automationTriggers)
      .set(updateData)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .returning();

    if (updatedTrigger.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update trigger',
        code: "UPDATE_FAILED" 
      }, { status: 500 });
    }

    return NextResponse.json(updatedTrigger[0]);

  } catch (error) {
    console.error('PUT trigger error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string; triggerId: string } }
) {
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
        code: "AUTOMATION_NOT_FOUND" 
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
        error: 'Trigger not found or does not belong to automation',
        code: "TRIGGER_NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete trigger
    const deletedTrigger = await db.delete(automationTriggers)
      .where(and(
        eq(automationTriggers.id, triggerIdInt),
        eq(automationTriggers.automationId, automationId)
      ))
      .returning();

    if (deletedTrigger.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete trigger',
        code: "DELETE_FAILED" 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Trigger deleted successfully',
      deletedTrigger: deletedTrigger[0]
    });

  } catch (error) {
    console.error('DELETE trigger error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}