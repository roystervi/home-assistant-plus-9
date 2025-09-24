import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automationConditions, automations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_CONDITION_TYPES = ['entity_state', 'numeric', 'time'];
const VALID_OPERATORS = ['equals', 'not_equals', 'greater', 'less', 'greater_equal', 'less_equal'];
const VALID_LOGICAL_OPERATORS = ['and', 'or'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const automationId = params.id;

    if (!automationId || isNaN(parseInt(automationId))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(automationId)))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    const conditions = await db.select()
      .from(automationConditions)
      .where(eq(automationConditions.automationId, parseInt(automationId)));

    return NextResponse.json(conditions);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const automationId = params.id;

    if (!automationId || isNaN(parseInt(automationId))) {
      return NextResponse.json({ 
        error: "Valid automation ID is required",
        code: "INVALID_AUTOMATION_ID" 
      }, { status: 400 });
    }

    // Verify automation exists
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, parseInt(automationId)))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({ 
        error: 'Automation not found' 
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const { type, entityId, attribute, operator, value, logicalOperator } = requestBody;

    // Validate required fields
    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_TYPE" 
      }, { status: 400 });
    }

    if (!operator) {
      return NextResponse.json({ 
        error: "Operator is required",
        code: "MISSING_OPERATOR" 
      }, { status: 400 });
    }

    if (!value) {
      return NextResponse.json({ 
        error: "Value is required",
        code: "MISSING_VALUE" 
      }, { status: 400 });
    }

    // Validate type
    if (!VALID_CONDITION_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: "Invalid condition type. Must be one of: " + VALID_CONDITION_TYPES.join(', '),
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Validate operator
    if (!VALID_OPERATORS.includes(operator)) {
      return NextResponse.json({ 
        error: "Invalid operator. Must be one of: " + VALID_OPERATORS.join(', '),
        code: "INVALID_OPERATOR" 
      }, { status: 400 });
    }

    // Validate logical operator if provided
    if (logicalOperator && !VALID_LOGICAL_OPERATORS.includes(logicalOperator)) {
      return NextResponse.json({ 
        error: "Invalid logical operator. Must be 'and' or 'or'",
        code: "INVALID_LOGICAL_OPERATOR" 
      }, { status: 400 });
    }

    // Validate entityId requirement for entity_state and numeric types
    if ((type === 'entity_state' || type === 'numeric') && !entityId) {
      return NextResponse.json({ 
        error: "EntityId is required for entity_state and numeric condition types",
        code: "MISSING_ENTITY_ID" 
      }, { status: 400 });
    }

    // Prepare insert data with auto-generated fields
    const insertData = {
      automationId: parseInt(automationId),
      type: type.trim(),
      entityId: entityId ? entityId.trim() : null,
      attribute: attribute ? attribute.trim() : null,
      operator: operator.trim(),
      value: value.toString().trim(),
      logicalOperator: logicalOperator ? logicalOperator.trim() : 'and',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newCondition = await db.insert(automationConditions)
      .values(insertData)
      .returning();

    return NextResponse.json(newCondition[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}