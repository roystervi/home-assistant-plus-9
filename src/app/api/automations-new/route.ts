import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Single automation with sub-resources
      const automationId = parseInt(id);
      if (isNaN(automationId)) {
        return NextResponse.json({ error: "Valid ID is required" }, { status: 400 });
      }

      const [automationRes] = await db.select().from(automations).where(eq(automations.id, automationId));
      if (!automationRes) {
        return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
      }

      const [triggers] = await db.select().from(automationTriggers).where(eq(automationTriggers.automationId, automationId));
      const [conditions] = await db.select().from(automationConditions).where(eq(automationConditions.automationId, automationId));
      const [actions] = await db.select().from(automationActions).where(eq(automationActions.automationId, automationId));

      const result = {
        ...automationRes,
        triggers,
        conditions,
        actions,
        tags: automationRes.tags ? JSON.parse(automationRes.tags) : []
      };

      return NextResponse.json(result);
    }

    // List automations with counts
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const enabled = searchParams.get('enabled');
    const source = searchParams.get('source');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(automations);
    let conditionsArr = [];

    if (search) {
      conditionsArr.push(or(like(automations.name, `%${search}%`), like(automations.description, `%${search}%`)));
    }
    if (enabled !== null) {
      conditionsArr.push(eq(automations.enabled, enabled === 'true'));
    }
    if (source) {
      conditionsArr.push(eq(automations.source, source));
    }
    if (conditionsArr.length > 0) {
      query = query.where(and(...conditionsArr));
    }

    const sortColumn = sort === 'name' ? automations.name : sort === 'enabled' ? automations.enabled : sort === 'source' ? automations.source : sort === 'updatedAt' ? automations.updatedAt : automations.createdAt;
    query = query.orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn));

    const results = await query.limit(limit).offset(offset);

    // Add counts for each
    const automationsWithCounts = await Promise.all(results.map(async (aut) => {
      const triggerCount = await db.select({ count: sql`count(*)` }).from(automationTriggers).where(eq(automationTriggers.automationId, aut.id));
      const conditionCount = await db.select({ count: sql`count(*)` }).from(automationConditions).where(eq(automationConditions.automationId, aut.id));
      const actionCount = await db.select({ count: sql`count(*)` }).from(automationActions).where(eq(automationActions.automationId, aut.id));

      return {
        ...aut,
        triggerCount: triggerCount[0]?.count || 0,
        conditionCount: conditionCount[0]?.count || 0,
        actionCount: actionCount[0]?.count || 0,
        tags: aut.tags ? JSON.parse(aut.tags) : []
      };
    }));

    const totalQuery = db.select().from(automations);
    if (conditionsArr.length > 0) totalQuery.where(and(...conditionsArr));
    const total = (await totalQuery).length;

    return NextResponse.json({
      data: automationsWithCounts,
      pagination: { limit, offset, total, hasMore: offset + limit < total }
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, enabled = true, source = 'local', tags = [] } = body;

    if (!name || typeof name !== 'string' || name.length > 255) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    if (!['local', 'ha'].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const existing = await db.select().from(automations).where(eq(automations.name, name.trim()));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Name already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const [newAut] = await db.insert(automations).values({
      name: name.trim(),
      description: description?.trim() || null,
      enabled: Boolean(enabled),
      source,
      tags: tags.length ? JSON.stringify(tags) : null,
      createdAt: now,
      updatedAt: now
    }).returning();

    return NextResponse.json({ ...newAut, tags: tags, triggers: [], conditions: [], actions: [] }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }

    const automationId = parseInt(id);
    const body = await request.json();
    const { name, description, enabled, source, tags } = body;

    const existing = await db.select().from(automations).where(eq(automations.id, automationId));
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (enabled !== undefined) updateData.enabled = Boolean(enabled);
    if (source !== undefined) updateData.source = source;
    if (tags !== undefined) updateData.tags = tags.length ? JSON.stringify(tags) : null;

    const [updated] = await db.update(automations).set(updateData).where(eq(automations.id, automationId)).returning();

    return NextResponse.json({ ...updated, tags: tags || JSON.parse(updated.tags || '[]') });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: "Valid ID required" }, { status: 400 });
    }

    const automationId = parseInt(id);

    // Delete sub-resources
    await db.delete(automationTriggers).where(eq(automationTriggers.automationId, automationId));
    await db.delete(automationConditions).where(eq(automationConditions.automationId, automationId));
    await db.delete(automationActions).where(eq(automationActions.automationId, automationId));

    await db.delete(automations).where(eq(automations.id, automationId));

    return NextResponse.json({ message: 'Deleted successfully' });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}