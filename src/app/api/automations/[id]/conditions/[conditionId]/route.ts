import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationConditions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_CONDITION_TYPES = ['entity_state', 'numeric', 'time'] as const;
const VALID_OPERATORS = ['equals', 'not_equals', 'greater', 'less', 'greater_equal', 'less_equal'] as const;
const VALID_LOGICAL_OPERATORS = ['and', 'or'] as const;

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
    const parsedConditionId = parseInt(conditionId);

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Verify condition exists and belongs to automation
    const existingCondition = await db.select()
      .from(automationConditions)
      .where(and(
        eq(automationConditions.id, parsedConditionId),
        eq(automationConditions.automationId, automationId)
      ))
      .limit(1);

    if (existingCondition.length === 0) {
      return NextResponse.json({ 
        error: 'Condition not found or does not belong to specified automation' 
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const { type, entityId, attribute, operator, value, logicalOperator } = requestBody;

    // Validate type if provided
    if (type && !VALID_CONDITION_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid condition type. Must be one of: ${VALID_CONDITION_TYPES.join(', ')}`,
        code: "INVALID_CONDITION_TYPE" 
      }, { status: 400 });
    }

    // Validate operator if provided
    if (operator && !VALID_OPERATORS.includes(operator)) {
      return NextResponse.json({ 
        error: `Invalid operator. Must be one of: ${VALID_OPERATORS.join(', ')}`,
        code: "INVALID_OPERATOR" 
      }, { status: 400 });
    }

    // Validate logicalOperator if provided
    if (logicalOperator && !VALID_LOGICAL_OPERATORS.includes(logicalOperator)) {
      return NextResponse.json({ 
        error: `Invalid logical operator. Must be one of: ${VALID_LOGICAL_OPERATORS.join(', ')}`,
        code: "INVALID_LOGICAL_OPERATOR" 
      }, { status: 400 });
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (type !== undefined) updateData.type = type;
    if (entityId !== undefined) updateData.entityId = entityId;
    if (attribute !== undefined) updateData.attribute = attribute;
    if (operator !== undefined) updateData.operator = operator;
    if (value !== undefined) updateData.value = value;
    if (logicalOperator !== undefined) updateData.logicalOperator = logicalOperator;

    // Update condition
    const updated = await db.update(automationConditions)
      .set(updateData)
      .where(and(
        eq(automationConditions.id, parsedConditionId),
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
    console.error('PUT error:', error);
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
    const parsedConditionId = parseInt(conditionId);

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    // Verify condition exists and belongs to automation
    const existingCondition = await db.select()
      .from(automationConditions)
      .where(and(
        eq(automationConditions.id, parsedConditionId),
        eq(automationConditions.automationId, automationId)
      ))
      .limit(1);

    if (existingCondition.length === 0) {
      return NextResponse.json({ 
        error: 'Condition not found or does not belong to specified automation' 
      }, { status: 404 });
    }

    // Delete condition
    const deleted = await db.delete(automationConditions)
      .where(and(
        eq(automationConditions.id, parsedConditionId),
        eq(automationConditions.automationId, automationId)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete condition' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Condition deleted successfully",
      deletedCondition: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}