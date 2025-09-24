import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { automations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Fetch current automation
    const existingAutomation = await db.select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (existingAutomation.length === 0) {
      return NextResponse.json({
        error: "Automation not found",
        code: "AUTOMATION_NOT_FOUND"
      }, { status: 404 });
    }

    const currentAutomation = existingAutomation[0];
    
    // Handle null enabled values (treat as false)
    const currentEnabledStatus = currentAutomation.enabled ?? false;
    
    // Toggle enabled status
    const newEnabledStatus = !currentEnabledStatus;

    // Update automation with toggled status
    const updatedAutomation = await db.update(automations)
      .set({
        enabled: newEnabledStatus,
        updatedAt: new Date().toISOString()
      })
      .where(eq(automations.id, automationId))
      .returning();

    if (updatedAutomation.length === 0) {
      return NextResponse.json({
        error: "Failed to update automation",
        code: "UPDATE_FAILED"
      }, { status: 500 });
    }

    return NextResponse.json({
      automation: updatedAutomation[0],
      message: `Automation enabled status changed from ${currentEnabledStatus} to ${newEnabledStatus}`,
      previousStatus: currentEnabledStatus,
      newStatus: newEnabledStatus
    });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}