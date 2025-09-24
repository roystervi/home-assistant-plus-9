import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Get automation with all related data
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(id)))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Get related triggers
    const triggers = await db.select()
      .from(automationTriggers)
      .where(eq(automationTriggers.automationId, parseInt(id)));

    // Get related conditions
    const conditions = await db.select()
      .from(automationConditions)
      .where(eq(automationConditions.automationId, parseInt(id)));

    // Get related actions
    const actions = await db.select()
      .from(automationActions)
      .where(eq(automationActions.automationId, parseInt(id)));

    // Build response with nested relationships
    const response = {
      ...automation[0],
      triggers: triggers,
      conditions: conditions,
      actions: actions
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Check if record exists
    const existing = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Validate fields
    const updates: any = {};

    if ('name' in requestBody) {
      if (typeof requestBody.name !== 'string' || requestBody.name.length > 255) {
        return NextResponse.json({ 
          error: "Name must be a string with maximum 255 characters",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }

      // Check for duplicate name (excluding current record)
      const duplicateName = await db.select()
        .from(automations)
        .where(and(eq(automations.name, requestBody.name), eq(automations.id, parseInt(id))));

      if (duplicateName.length > 0 && duplicateName[0].id !== parseInt(id)) {
        return NextResponse.json({ 
          error: "Automation name already exists",
          code: "DUPLICATE_NAME" 
        }, { status: 409 });
      }

      updates.name = requestBody.name.trim();
    }

    if ('description' in requestBody) {
      if (requestBody.description !== null && (typeof requestBody.description !== 'string' || requestBody.description.length > 1000)) {
        return NextResponse.json({ 
          error: "Description must be a string with maximum 1000 characters",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
      updates.description = requestBody.description ? requestBody.description.trim() : null;
    }

    if ('enabled' in requestBody) {
      if (typeof requestBody.enabled !== 'boolean') {
        return NextResponse.json({ 
          error: "Enabled must be a boolean",
          code: "INVALID_ENABLED" 
        }, { status: 400 });
      }
      updates.enabled = requestBody.enabled;
    }

    if ('source' in requestBody) {
      if (!['local', 'ha'].includes(requestBody.source)) {
        return NextResponse.json({ 
          error: "Source must be 'local' or 'ha'",
          code: "INVALID_SOURCE" 
        }, { status: 400 });
      }
      updates.source = requestBody.source;
    }

    if ('tags' in requestBody) {
      if (requestBody.tags !== null && (!Array.isArray(requestBody.tags) || !requestBody.tags.every(tag => typeof tag === 'string'))) {
        return NextResponse.json({ 
          error: "Tags must be an array of strings",
          code: "INVALID_TAGS" 
        }, { status: 400 });
      }
      updates.tags = requestBody.tags;
    }

    if ('lastRun' in requestBody) {
      if (requestBody.lastRun !== null) {
        try {
          new Date(requestBody.lastRun).toISOString();
          updates.lastRun = requestBody.lastRun;
        } catch {
          return NextResponse.json({ 
            error: "LastRun must be a valid ISO timestamp",
            code: "INVALID_LAST_RUN" 
          }, { status: 400 });
        }
      } else {
        updates.lastRun = null;
      }
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(automations)
      .set(updates)
      .where(eq(automations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Delete related records first (cascade delete)
    await db.delete(automationTriggers)
      .where(eq(automationTriggers.automationId, parseInt(id)));

    await db.delete(automationConditions)
      .where(eq(automationConditions.automationId, parseInt(id)));

    await db.delete(automationActions)
      .where(eq(automationActions.automationId, parseInt(id)));

    // Delete the automation
    const deleted = await db.delete(automations)
      .where(eq(automations.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Automation and all related data deleted successfully',
      automation: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}