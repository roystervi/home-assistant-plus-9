import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id || isNaN(parseInt(id))) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const sourceId = parseInt(id);
    const [source] = await db.select().from(automations).where(eq(automations.id, sourceId));
    if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Generate unique name
    let newName = `${source.name} (Copy)`;
    let counter = 2;
    while ((await db.select().from(automations).where(eq(automations.name, newName))).length > 0) {
      newName = `${source.name} (Copy ${counter++})`;
    }

    const now = new Date().toISOString();
    const [newAut] = await db.insert(automations).values({
      name: newName,
      description: source.description,
      enabled: false,
      source: source.source,
      tags: source.tags,
      createdAt: now,
      updatedAt: now
    }).returning();

    // Copy triggers
    const sourceTriggers = await db.select().from(automationTriggers).where(eq(automationTriggers.automationId, sourceId));
    for (const trigger of sourceTriggers) {
      await db.insert(automationTriggers).values({ ...trigger, automationId: newAut.id, id: undefined, createdAt: now, updatedAt: now });
    }

    // Copy conditions
    const sourceConditions = await db.select().from(automationConditions).where(eq(automationConditions.automationId, sourceId));
    for (const condition of sourceConditions) {
      await db.insert(automationConditions).values({ ...condition, automationId: newAut.id, id: undefined, createdAt: now, updatedAt: now });
    }

    // Copy actions
    const sourceActions = await db.select().from(automationActions).where(eq(automationActions.automationId, sourceId));
    for (const action of sourceActions) {
      await db.insert(automationActions).values({ ...action, automationId: newAut.id, id: undefined, createdAt: now, updatedAt: now });
    }

    // Fetch new with sub-resources
    const newTriggers = await db.select().from(automationTriggers).where(eq(automationTriggers.automationId, newAut.id));
    const newConditions = await db.select().from(automationConditions).where(eq(automationConditions.automationId, newAut.id));
    const newActions = await db.select().from(automationActions).where(eq(automationActions.automationId, newAut.id));

    const result = {
      ...newAut,
      triggers: newTriggers,
      conditions: newConditions,
      actions: newActions,
      tags: source.tags ? JSON.parse(source.tags) : []
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}