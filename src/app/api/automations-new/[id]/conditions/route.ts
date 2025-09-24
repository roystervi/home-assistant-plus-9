import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationConditions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = parseInt(params.id);
    
    if (!automationId || isNaN(automationId)) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

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

    // Get all conditions for this automation
    const conditions = await db.select()
      .from(automationConditions)
      .where(eq(automationConditions.automationId, automationId));

    return NextResponse.json(conditions);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const automationId = parseInt(params.id);
    
    if (!automationId || isNaN(automationId)) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

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

    const requestBody = await request.json();
    const { type, operator, value, entityId, attribute, logicalOperator } = requestBody;

    // Validate required fields
    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!operator) {
      return NextResponse.json({ 
        error: "Operator is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!value) {
      return NextResponse.json({ 
        error: "Value is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate condition type
    const allowedTypes = ['entity_state', 'numeric', 'time'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ 
        error: "Type must be one of: entity_state, numeric, time",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Validate operator
    const allowedOperators = ['equals', 'not_equals', 'greater', 'less', 'greater_equal', 'less_equal'];
    if (!allowedOperators.includes(operator)) {
      return NextResponse.json({ 
        error: "Operator must be one of: equals, not_equals, greater, less, greater_equal, less_equal",
        code: "INVALID_OPERATOR" 
      }, { status: 400 });
    }

    // Validate logical operator
    if (logicalOperator && !['and', 'or'].includes(logicalOperator)) {
      return NextResponse.json({ 
        error: "Logical operator must be 'and' or 'or'",
        code: "INVALID_LOGICAL_OPERATOR" 
      }, { status: 400 });
    }

    // Type-specific validation
    if ((type === 'entity_state' || type === 'numeric') && !entityId) {
      return NextResponse.json({ 
        error: "Entity ID is required for entity_state and numeric condition types",
        code: "MISSING_ENTITY_ID" 
      }, { status: 400 });
    }

    // Prepare condition data
    const conditionData = {
      automationId,
      type: type.trim(),
      entityId: entityId?.trim() || null,
      attribute: attribute?.trim() || null,
      operator: operator.trim(),
      value: value.toString().trim(),
      logicalOperator: logicalOperator?.trim() || 'and',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert new condition
    const newCondition = await db.insert(automationConditions)
      .values(conditionData)
      .returning();

    return NextResponse.json(newCondition[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}