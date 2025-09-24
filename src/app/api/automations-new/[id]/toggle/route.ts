import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const automationId = parseInt(id);

    // Check if automation exists
    const existingAutomation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (existingAutomation.length === 0) {
      return NextResponse.json({
        error: 'Automation not found',
        code: 'AUTOMATION_NOT_FOUND'
      }, { status: 404 });
    }

    const currentAutomation = existingAutomation[0];
    const previousEnabled = currentAutomation.enabled;
    const newEnabled = !previousEnabled;

    // Toggle the enabled status
    const updatedAutomation = await db.update(automations)
      .set({
        enabled: newEnabled,
        updatedAt: new Date().toISOString()
      })
      .where(eq(automations.id, automationId))
      .returning();

    if (updatedAutomation.length === 0) {
      return NextResponse.json({
        error: 'Failed to update automation',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    // After updating enabled:
    const [triggers] = await db.select().from(automationTriggers).where(eq(automationTriggers.automationId, automationId));
    const [conditions] = await db.select().from(automationConditions).where(eq(automationConditions.automationId, automationId));
    const [actions] = await db.select().from(automationActions).where(eq(automationActions.automationId, automationId));

    const completeAutomation = {
      ...updatedAutomation[0],
      triggers,
      conditions,
      actions,
      tags: updatedAutomation[0].tags ? JSON.parse(updatedAutomation[0].tags) : []
    };

    return NextResponse.json({
      message: `Automation ${newEnabled ? 'enabled' : 'disabled'} successfully`,
      previousEnabled,
      newEnabled,
      automation: completeAutomation
    });

  } catch (error) {
    console.error('PUT toggle error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}