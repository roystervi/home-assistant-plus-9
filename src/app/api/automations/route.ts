import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single automation by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const automation = await db.select()
        .from(automations)
        .where(eq(automations.id, parseInt(id)))
        .limit(1);

      if (automation.length === 0) {
        return NextResponse.json({ 
          error: 'Automation not found' 
        }, { status: 404 });
      }

      return NextResponse.json(automation[0]);
    }

    // List automations with pagination, search, and filters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const enabled = searchParams.get('enabled');
    const source = searchParams.get('source');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(automations);

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(automations.name, `%${search}%`),
          like(automations.description, `%${search}%`)
        )
      );
    }

    if (enabled !== null && enabled !== undefined) {
      const enabledBool = enabled === 'true';
      conditions.push(eq(automations.enabled, enabledBool));
    }

    if (source) {
      if (source !== 'local' && source !== 'ha') {
        return NextResponse.json({ 
          error: "Source must be 'local' or 'ha'",
          code: "INVALID_SOURCE" 
        }, { status: 400 });
      }
      conditions.push(eq(automations.source, source));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Add sorting
    const orderDirection = order === 'asc' ? asc : desc;
    if (sort === 'name') {
      query = query.orderBy(orderDirection(automations.name));
    } else if (sort === 'updatedAt') {
      query = query.orderBy(orderDirection(automations.updatedAt));
    } else {
      query = query.orderBy(orderDirection(automations.createdAt));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { name, description, enabled, source, tags } = requestBody;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: "Name is required and must be a non-empty string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json({ 
        error: "Name must be 255 characters or less",
        code: "NAME_TOO_LONG" 
      }, { status: 400 });
    }

    // Validate optional fields
    if (description && (typeof description !== 'string' || description.length > 1000)) {
      return NextResponse.json({ 
        error: "Description must be a string with 1000 characters or less",
        code: "INVALID_DESCRIPTION" 
      }, { status: 400 });
    }

    if (source && source !== 'local' && source !== 'ha') {
      return NextResponse.json({ 
        error: "Source must be 'local' or 'ha'",
        code: "INVALID_SOURCE" 
      }, { status: 400 });
    }

    // Validate tags as JSON array
    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        return NextResponse.json({ 
          error: "Tags must be an array of strings",
          code: "INVALID_TAGS" 
        }, { status: 400 });
      }
    }

    // Check for duplicate automation name
    const existing = await db.select()
      .from(automations)
      .where(eq(automations.name, name.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: "Automation name already exists",
        code: "DUPLICATE_NAME" 
      }, { status: 409 });
    }

    // Prepare data with defaults and timestamps
    const now = new Date().toISOString();
    const automationData = {
      name: name.trim(),
      description: description ? description.trim() : null,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      source: source || 'local',
      tags: tags || null,
      createdAt: now,
      updatedAt: now,
      lastRun: null
    };

    const newAutomation = await db.insert(automations)
      .values(automationData)
      .returning();

    return NextResponse.json(newAutomation[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
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
    const { name, description, enabled, source, tags, lastRun } = requestBody;

    // Check if automation exists
    const existingAutomation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(id)))
      .limit(1);

    if (existingAutomation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Validate fields if provided
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: "Name must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }

      if (name.length > 255) {
        return NextResponse.json({ 
          error: "Name must be 255 characters or less",
          code: "NAME_TOO_LONG" 
        }, { status: 400 });
      }

      // Check for duplicate name (excluding current automation)
      const existing = await db.select()
        .from(automations)
        .where(and(
          eq(automations.name, name.trim()),
          eq(automations.id, parseInt(id))
        ))
        .limit(1);

      if (existing.length === 0) {
        const duplicateCheck = await db.select()
          .from(automations)
          .where(eq(automations.name, name.trim()))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return NextResponse.json({ 
            error: "Automation name already exists",
            code: "DUPLICATE_NAME" 
          }, { status: 409 });
        }
      }
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 1000) {
        return NextResponse.json({ 
          error: "Description must be a string with 1000 characters or less",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
    }

    if (source !== undefined && source !== 'local' && source !== 'ha') {
      return NextResponse.json({ 
        error: "Source must be 'local' or 'ha'",
        code: "INVALID_SOURCE" 
      }, { status: 400 });
    }

    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        return NextResponse.json({ 
          error: "Tags must be an array of strings",
          code: "INVALID_TAGS" 
        }, { status: 400 });
      }
    }

    if (lastRun !== undefined && lastRun !== null) {
      if (typeof lastRun !== 'string' || isNaN(Date.parse(lastRun))) {
        return NextResponse.json({ 
          error: "Last run must be a valid ISO timestamp string",
          code: "INVALID_LAST_RUN" 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updates = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (enabled !== undefined) updates.enabled = Boolean(enabled);
    if (source !== undefined) updates.source = source;
    if (tags !== undefined) updates.tags = tags;
    if (lastRun !== undefined) updates.lastRun = lastRun;

    const updatedAutomation = await db.update(automations)
      .set(updates)
      .where(eq(automations.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedAutomation[0]);
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

    // Check if automation exists
    const existingAutomation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(id)))
      .limit(1);

    if (existingAutomation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    const deletedAutomation = await db.delete(automations)
      .where(eq(automations.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Automation deleted successfully',
      automation: deletedAutomation[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}