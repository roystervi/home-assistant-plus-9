import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationConditions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; conditionId: string } }
) {
  try {
    const { id, conditionId } = params;
    
    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }
    
    if (!conditionId || isNaN(parseInt(conditionId))) {
      return NextResponse.json({ 
        error: "Valid condition ID is required",
        code: "INVALID_CONDITION_ID" 
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const condId = parseInt(conditionId);

    // Check if automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Check if condition exists and belongs to automation
    const existingCondition = await db.select()
      .from(automationConditions)
      .where(and(
        eq(automationConditions.id, condId),
        eq(automationConditions.automationId, automationId)
      ))
      .limit(1);

    if (existingCondition.length === 0) {
      return NextResponse.json({ 
        error: 'Condition not found or does not belong to automation' 
      }, { status: 404 });
    }

    const requestBody = await request.json();

    // Validate required fields if provided
    const { type, operator, value, entityId, attribute, logicalOperator } = requestBody;

    if (type !== undefined && (!type || type.trim() === '')) {
      return NextResponse.json({ 
        error: "Type cannot be empty",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (operator !== undefined && (!operator || operator.trim() === '')) {
      return NextResponse.json({ 
        error: "Operator cannot be empty",
        code: "INVALID_OPERATOR" 
      }, { status: 400 });
    }

    if (value !== undefined && (value === null || value === '')) {
      return NextResponse.json({ 
        error: "Value cannot be empty",
        code: "INVALID_VALUE" 
      }, { status: 400 });
    }

    // Validate logical operator if provided
    if (logicalOperator !== undefined && !['and', 'or'].includes(logicalOperator)) {
      return NextResponse.json({ 
        error: "Logical operator must be 'and' or 'or'",
        code: "INVALID_LOGICAL_OPERATOR" 
      }, { status: 400 });
    }

    // Validate entity-specific requirements for certain types
    if ((type === 'state' || type === 'numeric_state') && entityId !== undefined && (!entityId || entityId.trim() === '')) {
      return NextResponse.json({ 
        error: "Entity ID is required for state and numeric_state conditions",
        code: "MISSING_ENTITY_ID" 
      }, { status: 400 });
    }

    // Prepare update data - only include fields that were provided
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (type !== undefined) updateData.type = type.trim();
    if (operator !== undefined) updateData.operator = operator.trim();
    if (value !== undefined) updateData.value = String(value).trim();
    if (entityId !== undefined) updateData.entityId = entityId ? entityId.trim() : null;
    if (attribute !== undefined) updateData.attribute = attribute ? attribute.trim() : null;
    if (logicalOperator !== undefined) updateData.logicalOperator = logicalOperator;

    // Update condition
    const updated = await db.update(automationConditions)
      .set(updateData)
      .where(and(
        eq(automationConditions.id, condId),
        eq(automationConditions.automationId, automationId)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update condition' 
      }, { status: 500 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT condition error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; conditionId: string } }
) {
  try {
    const { id, conditionId } = params;
    
    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }
    
    if (!conditionId || isNaN(parseInt(conditionId))) {
      return NextResponse.json({ 
        error: "Valid condition ID is required",
        code: "INVALID_CONDITION_ID" 
      }, { status: 400 });
    }

    const automationId = parseInt(id);
    const condId = parseInt(conditionId);

    // Check if automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Check if condition exists and belongs to automation
    const existingCondition = await db.select()
      .from(automationConditions)
      .where(and(
        eq(automationConditions.id, condId),
        eq(automationConditions.automationId, automationId)
      ))
      .limit(1);

    if (existingCondition.length === 0) {
      return NextResponse.json({ 
        error: 'Condition not found or does not belong to automation' 
      }, { status: 404 });
    }

    // Delete condition
    const deleted = await db.delete(automationConditions)
      .where(and(
        eq(automationConditions.id, condId),
        eq(automationConditions.automationId, automationId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete condition' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Condition deleted successfully',
      deletedCondition: deleted[0]
    });

  } catch (error) {
    console.error('DELETE condition error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}