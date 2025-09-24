import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationActions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const automationIdParam = searchParams.get('id');

    // Validate automation ID parameter
    if (!automationIdParam || isNaN(parseInt(automationIdParam))) {
      return NextResponse.json({
        error: 'Valid automation ID is required',
        code: 'INVALID_AUTOMATION_ID'
      }, { status: 400 });
    }

    const automationId = parseInt(automationIdParam);

    // Fetch automation and verify it exists
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

    // Fetch all actions for the automation
    const actions = await db.select()
      .from(automationActions)
      .where(eq(automationActions.automationId, automationId));

    const testExecutedAt = new Date().toISOString();
    const actionsExecuted = [];
    let successfulActions = 0;
    let failedActions = 0;

    // Simulate each action
    for (const action of actions) {
      let status = 'simulated';
      let message = '';

      try {
        switch (action.type) {
          case 'service_call':
            if (!action.service) {
              status = 'failed';
              message = 'Service call action missing service name';
              failedActions++;
            } else {
              const entityInfo = action.entityId ? ` on ${action.entityId}` : '';
              const dataInfo = action.data ? ` with data: ${JSON.stringify(action.data)}` : '';
              message = `Would call service ${action.service}${entityInfo}${dataInfo}`;
              successfulActions++;
            }
            break;

          case 'scene':
            if (!action.sceneId) {
              status = 'failed';
              message = 'Scene action missing scene ID';
              failedActions++;
            } else {
              message = `Would activate scene ${action.sceneId}`;
              successfulActions++;
            }
            break;

          case 'local_device':
            if (!action.entityId) {
              status = 'failed';
              message = 'Local device action missing entity ID';
              failedActions++;
            } else {
              const dataInfo = action.data ? ` with data: ${JSON.stringify(action.data)}` : '';
              message = `Would send command to local device ${action.entityId}${dataInfo}`;
              successfulActions++;
            }
            break;

          default:
            status = 'failed';
            message = `Unknown action type: ${action.type}`;
            failedActions++;
            break;
        }

        const actionResult: any = {
          actionId: action.id,
          type: action.type,
          status,
          message
        };

        // Include type-specific fields in response
        if (action.type === 'service_call') {
          actionResult.service = action.service;
          actionResult.entityId = action.entityId;
          actionResult.data = action.data;
        } else if (action.type === 'scene') {
          actionResult.sceneId = action.sceneId;
        } else if (action.type === 'local_device') {
          actionResult.entityId = action.entityId;
          actionResult.data = action.data;
        }

        actionsExecuted.push(actionResult);

      } catch (actionError) {
        console.error(`Error simulating action ${action.id}:`, actionError);
        actionsExecuted.push({
          actionId: action.id,
          type: action.type,
          status: 'failed',
          message: `Error simulating action: ${actionError}`
        });
        failedActions++;
      }
    }

    // Update automation lastRun timestamp
    await db.update(automations)
      .set({
        lastRun: testExecutedAt,
        updatedAt: new Date().toISOString()
      })
      .where(eq(automations.id, automationId));

    // Return test execution results
    return NextResponse.json({
      automationId,
      automationName: automationRecord.name,
      testExecutedAt,
      status: failedActions === 0 ? 'success' : 'partial_success',
      actionsExecuted,
      summary: {
        totalActions: actions.length,
        successfulActions,
        failedActions
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}