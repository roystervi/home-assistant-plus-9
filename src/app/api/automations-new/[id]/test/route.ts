import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid automation ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const automationId = parseInt(id);

    // Get automation by ID
    const automation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (automation.length === 0) {
      return NextResponse.json({
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND'
      }, { status: 404 });
    }

    const automationRecord = automation[0];

    // Get triggers, conditions, and actions
    const [triggers, conditions, actions] = await Promise.all([
      db.select().from(automationTriggers).where(eq(automationTriggers.automationId, automationId)),
      db.select().from(automationConditions).where(eq(automationConditions.automationId, automationId)),
      db.select().from(automationActions).where(eq(automationActions.automationId, automationId))
    ]);

    // Simulate triggers
    const simulatedTriggers = triggers.map(trigger => {
      const { isValid, message } = simulateTrigger(trigger);
      return {
        id: trigger.id,
        type: trigger.type,
        status: isValid ? 'valid' : 'invalid',
        message
      };
    });

    // Simulate conditions
    const simulatedConditions = conditions.map(condition => {
      const { passes, message } = simulateCondition(condition);
      return {
        id: condition.id,
        type: condition.type,
        status: passes ? 'pass' : 'fail',
        message
      };
    });

    // Simulate actions
    const simulatedActions = actions.map(action => {
      const { success, message, effect } = simulateAction(action);
      return {
        id: action.id,
        type: action.type,
        status: success ? 'success' : 'failed',
        message,
        simulatedEffect: effect
      };
    });

    // Calculate summary
    const validTriggers = simulatedTriggers.filter(t => t.status === 'valid').length;
    const passedConditions = simulatedConditions.filter(c => c.status === 'pass').length;
    const successfulActions = simulatedActions.filter(a => a.status === 'success').length;
    const failedActions = simulatedActions.filter(a => a.status === 'failed').length;

    // Determine overall status
    let status: 'success' | 'partial_success' | 'failed';
    if (validTriggers === triggers.length && 
        passedConditions === conditions.length && 
        failedActions === 0) {
      status = 'success';
    } else if (validTriggers > 0 && successfulActions > 0) {
      status = 'partial_success';
    } else {
      status = 'failed';
    }

    // Update automation's lastRun timestamp
    const currentTime = new Date().toISOString();
    await db.update(automations)
      .set({
        lastRun: currentTime,
        updatedAt: currentTime
      })
      .where(eq(automations.id, automationId));

    // Return simulation results
    return NextResponse.json({
      automationId: automationRecord.id,
      automationName: automationRecord.name,
      testExecutedAt: currentTime,
      status,
      summary: {
        totalTriggers: triggers.length,
        validTriggers,
        totalConditions: conditions.length,
        passedConditions,
        totalActions: actions.length,
        successfulActions,
        failedActions
      },
      triggers: simulatedTriggers,
      conditions: simulatedConditions,
      actions: simulatedActions
    }, { status: 200 });

  } catch (error) {
    console.error('POST /api/automations-new/[id]/test error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'SIMULATION_ERROR'
    }, { status: 500 });
  }
}

function simulateTrigger(trigger: any): { isValid: boolean; message: string } {
  const requiredFields = {
    'state': ['entityId', 'state'],
    'time': ['time'],
    'mqtt': ['topic'],
    'numeric_state': ['entityId', 'attribute'],
    'device': ['entityId']
  };

  const required = requiredFields[trigger.type as keyof typeof requiredFields] || [];
  
  for (const field of required) {
    if (!trigger[field]) {
      return {
        isValid: false,
        message: `Missing required field: ${field}`
      };
    }
  }

  switch (trigger.type) {
    case 'state':
      return {
        isValid: true,
        message: `Would trigger when ${trigger.entityId} changes to ${trigger.state}`
      };
    case 'time':
      return {
        isValid: true,
        message: `Would trigger at ${trigger.time}${trigger.offset ? ` with ${trigger.offset}s offset` : ''}`
      };
    case 'mqtt':
      return {
        isValid: true,
        message: `Would trigger on MQTT topic: ${trigger.topic}${trigger.payload ? ` with payload: ${trigger.payload}` : ''}`
      };
    case 'numeric_state':
      return {
        isValid: true,
        message: `Would trigger when ${trigger.entityId}.${trigger.attribute} changes numerically`
      };
    case 'device':
      return {
        isValid: true,
        message: `Would trigger on device event from ${trigger.entityId}`
      };
    default:
      return {
        isValid: false,
        message: `Unknown trigger type: ${trigger.type}`
      };
  }
}

function simulateCondition(condition: any): { passes: boolean; message: string } {
  const requiredFields = ['entityId', 'operator', 'value'];
  
  for (const field of requiredFields) {
    if (!condition[field]) {
      return {
        passes: false,
        message: `Missing required field: ${field}`
      };
    }
  }

  const validOperators = ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'in', 'not_in', 'regex'];
  
  if (!validOperators.includes(condition.operator)) {
    return {
      passes: false,
      message: `Invalid operator: ${condition.operator}`
    };
  }

  // Simulate condition evaluation (always passes for testing purposes)
  const attribute = condition.attribute ? `.${condition.attribute}` : '';
  return {
    passes: true,
    message: `Condition would check if ${condition.entityId}${attribute} ${condition.operator} ${condition.value}`
  };
}

function simulateAction(action: any): { success: boolean; message: string; effect: string } {
  switch (action.type) {
    case 'service_call':
      if (!action.service || !action.entityId) {
        return {
          success: false,
          message: 'Missing required fields: service or entityId',
          effect: 'No action would be taken'
        };
      }
      return {
        success: true,
        message: `Would call service ${action.service} on ${action.entityId}`,
        effect: `Service ${action.service} would be executed on entity ${action.entityId}${action.data ? ` with data: ${JSON.stringify(action.data)}` : ''}`
      };

    case 'scene':
      if (!action.sceneId) {
        return {
          success: false,
          message: 'Missing required field: sceneId',
          effect: 'No scene would be activated'
        };
      }
      return {
        success: true,
        message: `Would activate scene ${action.sceneId}`,
        effect: `Scene ${action.sceneId} would be activated, changing multiple entities to their scene states`
      };

    case 'mqtt':
      if (!action.topic || !action.payload) {
        return {
          success: false,
          message: 'Missing required fields: topic or payload',
          effect: 'No MQTT message would be sent'
        };
      }
      return {
        success: true,
        message: `Would publish MQTT message to ${action.topic}`,
        effect: `MQTT message would be published to topic ${action.topic} with payload: ${action.payload}`
      };

    case 'delay':
      const delayTime = action.data?.seconds || 5;
      return {
        success: true,
        message: `Would delay for ${delayTime} seconds`,
        effect: `Automation would pause for ${delayTime} seconds before continuing`
      };

    case 'notification':
      if (!action.data?.message) {
        return {
          success: false,
          message: 'Missing required field: message in data',
          effect: 'No notification would be sent'
        };
      }
      return {
        success: true,
        message: `Would send notification: ${action.data.message}`,
        effect: `Notification would be sent with message: "${action.data.message}"${action.data.title ? ` and title: "${action.data.title}"` : ''}`
      };

    default:
      return {
        success: false,
        message: `Unknown action type: ${action.type}`,
        effect: 'No action would be taken due to unknown type'
      };
  }
}