import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationActions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_ACTION_TYPES = ['service_call', 'mqtt', 'scene', 'local_device'];

function validateActionType(type: string, data: any) {
  switch (type) {
    case 'service_call':
      if (!data.service || !data.entityId) {
        return 'service_call actions require service and entityId fields';
      }
      break;
    case 'mqtt':
      if (!data.topic) {
        return 'mqtt actions require topic field';
      }
      break;
    case 'scene':
      if (!data.sceneId) {
        return 'scene actions require sceneId field';
      }
      break;
    case 'local_device':
      if (!data.entityId) {
        return 'local_device actions require entityId field';
      }
      break;
    default:
      return `Invalid action type. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`;
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const { id, actionId } = params;

    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID"
      }, { status: 400 });
    }

    if (!actionId || isNaN(parseInt(actionId))) {
      return NextResponse.json({
        error: "Valid action ID is required",
        code: "INVALID_ACTION_ID"
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const actionIdInt = parseInt(actionId);

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

    // Verify action exists and belongs to automation
    const existingAction = await db.select()
      .from(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .limit(1);

    if (existingAction.length === 0) {
      return NextResponse.json({
        error: 'Action not found or does not belong to specified automation',
        code: 'ACTION_NOT_FOUND'
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const { type, service, entityId, data, topic, payload, sceneId } = requestBody;

    // Validate action type if provided
    if (type && !VALID_ACTION_TYPES.includes(type)) {
      return NextResponse.json({
        error: `Invalid action type. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
        code: "INVALID_ACTION_TYPE"
      }, { status: 400 });
    }

    // Validate JSON data if provided
    let parsedData = data;
    if (data !== undefined && data !== null) {
      try {
        if (typeof data === 'string') {
          parsedData = JSON.parse(data);
        } else if (typeof data === 'object') {
          parsedData = data;
        } else {
          return NextResponse.json({
            error: 'Data field must be a valid JSON object or string',
            code: 'INVALID_JSON_DATA'
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid JSON format in data field',
          code: 'MALFORMED_JSON'
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (type !== undefined) updateData.type = type;
    if (service !== undefined) updateData.service = service;
    if (entityId !== undefined) updateData.entityId = entityId;
    if (parsedData !== undefined) updateData.data = parsedData;
    if (topic !== undefined) updateData.topic = topic;
    if (payload !== undefined) updateData.payload = payload;
    if (sceneId !== undefined) updateData.sceneId = sceneId;

    // Validate type-specific requirements if type is being changed or if it's a new validation
    const finalType = type || existingAction[0].type;
    const finalData = {
      service: service !== undefined ? service : existingAction[0].service,
      entityId: entityId !== undefined ? entityId : existingAction[0].entityId,
      topic: topic !== undefined ? topic : existingAction[0].topic,
      sceneId: sceneId !== undefined ? sceneId : existingAction[0].sceneId
    };

    const typeValidationError = validateActionType(finalType, finalData);
    if (typeValidationError) {
      return NextResponse.json({
        error: typeValidationError,
        code: "TYPE_VALIDATION_FAILED"
      }, { status: 400 });
    }

    // Update the action
    const updated = await db.update(automationActions)
      .set(updateData)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({
        error: 'Failed to update action',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const { id, actionId } = params;

    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID"
      }, { status: 400 });
    }

    if (!actionId || isNaN(parseInt(actionId))) {
      return NextResponse.json({
        error: "Valid action ID is required",
        code: "INVALID_ACTION_ID"
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const actionIdInt = parseInt(actionId);

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

    // Verify action exists and belongs to automation
    const existingAction = await db.select()
      .from(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .limit(1);

    if (existingAction.length === 0) {
      return NextResponse.json({
        error: 'Action not found or does not belong to specified automation',
        code: 'ACTION_NOT_FOUND'
      }, { status: 404 });
    }

    // Delete the action
    const deleted = await db.delete(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({
        error: 'Failed to delete action',
        code: 'DELETE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Action deleted successfully",
      deletedAction: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}