import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');

    // Validate required parameters
    if (!sourceId || isNaN(parseInt(sourceId))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const sourceAutomationId = parseInt(sourceId);

    // Start transaction by fetching source automation
    const sourceAutomation = await db.select()
      .from(automations)
      .where(eq(automations.id, sourceAutomationId))
      .limit(1);

    if (sourceAutomation.length === 0) {
      return NextResponse.json({ 
        error: 'Source automation not found',
        code: 'AUTOMATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const automation = sourceAutomation[0];

    // Fetch all related data
    const [triggers, conditions, actions] = await Promise.all([
      db.select().from(automationTriggers).where(eq(automationTriggers.automationId, sourceAutomationId)),
      db.select().from(automationConditions).where(eq(automationConditions.automationId, sourceAutomationId)),
      db.select().from(automationActions).where(eq(automationActions.automationId, sourceAutomationId))
    ]);

    // Generate unique name
    const baseName = automation.name;
    let newName = `${baseName} (Copy)`;
    
    // Check for existing copies and find next available number
    let copyNumber = 1;
    while (true) {
      const existingNames = await db.select({ name: automations.name })
        .from(automations)
        .where(eq(automations.name, newName));
      
      if (existingNames.length === 0) {
        break;
      }
      
      copyNumber++;
      newName = copyNumber === 2 ? `${baseName} (Copy 2)` : `${baseName} (Copy ${copyNumber})`;
    }

    const currentTimestamp = new Date().toISOString();

    // Create new automation
    const newAutomation = await db.insert(automations)
      .values({
        name: newName,
        description: automation.description,
        enabled: false, // Set to false for safety
        source: automation.source,
        tags: automation.tags,
        lastRun: null, // Clear last run
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      })
      .returning();

    if (newAutomation.length === 0) {
      throw new Error('Failed to create duplicated automation');
    }

    const newAutomationId = newAutomation[0].id;

    // Copy triggers
    const copiedTriggers = [];
    if (triggers.length > 0) {
      const triggerData = triggers.map(trigger => ({
        automationId: newAutomationId,
        type: trigger.type,
        entityId: trigger.entityId,
        attribute: trigger.attribute,
        state: trigger.state,
        time: trigger.time,
        offset: trigger.offset,
        topic: trigger.topic,
        payload: trigger.payload,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      }));

      const insertedTriggers = await db.insert(automationTriggers)
        .values(triggerData)
        .returning();
      
      copiedTriggers.push(...insertedTriggers);
    }

    // Copy conditions
    const copiedConditions = [];
    if (conditions.length > 0) {
      const conditionData = conditions.map(condition => ({
        automationId: newAutomationId,
        type: condition.type,
        entityId: condition.entityId,
        attribute: condition.attribute,
        operator: condition.operator,
        value: condition.value,
        logicalOperator: condition.logicalOperator,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      }));

      const insertedConditions = await db.insert(automationConditions)
        .values(conditionData)
        .returning();
      
      copiedConditions.push(...insertedConditions);
    }

    // Copy actions
    const copiedActions = [];
    if (actions.length > 0) {
      const actionData = actions.map(action => ({
        automationId: newAutomationId,
        type: action.type,
        service: action.service,
        entityId: action.entityId,
        data: action.data,
        topic: action.topic,
        payload: action.payload,
        sceneId: action.sceneId,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      }));

      const insertedActions = await db.insert(automationActions)
        .values(actionData)
        .returning();
      
      copiedActions.push(...insertedActions);
    }

    // Return complete duplicated automation with nested relationships
    const response = {
      ...newAutomation[0],
      triggers: copiedTriggers,
      conditions: copiedConditions,
      actions: copiedActions
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST duplication error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}