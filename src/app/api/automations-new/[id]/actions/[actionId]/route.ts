import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automationActions, automations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Check if automation exists
    const automationCheck = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automationCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if action exists and belongs to automation
    const actionCheck = await db.select()
      .from(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .limit(1);

    if (actionCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Action not found or does not belong to this automation',
        code: 'ACTION_NOT_FOUND' 
      }, { status: 404 });
    }

    const requestBody = await request.json();

    // Validate type field if provided
    if (requestBody.type !== undefined) {
      if (!requestBody.type || typeof requestBody.type !== 'string' || requestBody.type.trim().length === 0) {
        return NextResponse.json({ 
          error: "Action type is required and must be a non-empty string",
          code: "INVALID_TYPE" 
        }, { status: 400 });
      }
    }

    // Validate data field if provided (must be valid JSON object)
    if (requestBody.data !== undefined) {
      if (requestBody.data !== null && typeof requestBody.data !== 'object') {
        return NextResponse.json({ 
          error: "Data field must be a valid JSON object or null",
          code: "INVALID_DATA_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate string fields if provided
    const stringFields = ['service', 'entityId', 'topic', 'payload', 'sceneId'];
    for (const field of stringFields) {
      if (requestBody[field] !== undefined && requestBody[field] !== null) {
        if (typeof requestBody[field] !== 'string') {
          return NextResponse.json({ 
            error: `${field} must be a string`,
            code: "INVALID_STRING_FIELD" 
          }, { status: 400 });
        }
      }
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Only add fields that are provided in the request
    if (requestBody.type !== undefined) {
      updateData.type = requestBody.type.trim();
    }
    if (requestBody.service !== undefined) {
      updateData.service = requestBody.service ? requestBody.service.trim() : null;
    }
    if (requestBody.entityId !== undefined) {
      updateData.entityId = requestBody.entityId ? requestBody.entityId.trim() : null;
    }
    if (requestBody.data !== undefined) {
      updateData.data = requestBody.data;
    }
    if (requestBody.topic !== undefined) {
      updateData.topic = requestBody.topic ? requestBody.topic.trim() : null;
    }
    if (requestBody.payload !== undefined) {
      updateData.payload = requestBody.payload ? requestBody.payload.trim() : null;
    }
    if (requestBody.sceneId !== undefined) {
      updateData.sceneId = requestBody.sceneId ? requestBody.sceneId.trim() : null;
    }

    // Update the action
    const updatedAction = await db.update(automationActions)
      .set(updateData)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .returning();

    if (updatedAction.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update action',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updatedAction[0]);

  } catch (error) {
    console.error('PUT action error:', error);
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

    // Check if automation exists
    const automationCheck = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automationCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if action exists and belongs to automation
    const actionCheck = await db.select()
      .from(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .limit(1);

    if (actionCheck.length === 0) {
      return NextResponse.json({ 
        error: 'Action not found or does not belong to this automation',
        code: 'ACTION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete the action
    const deletedAction = await db.delete(automationActions)
      .where(and(
        eq(automationActions.id, actionIdInt),
        eq(automationActions.automationId, automationId)
      ))
      .returning();

    if (deletedAction.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete action',
        code: 'DELETE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Action deleted successfully',
      deletedAction: deletedAction[0]
    });

  } catch (error) {
    console.error('DELETE action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}