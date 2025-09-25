import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { globalSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const record = await db.select()
      .from(globalSettings)
      .where(eq(globalSettings.id, 1))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json({ settings: {} });
    }

    return NextResponse.json({ settings: record[0].settings });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    // Validate that settings is provided
    if (settings === undefined) {
      return NextResponse.json({ 
        error: "Settings field is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate that settings is a valid object (not null, not array)
    if (settings === null || Array.isArray(settings) || typeof settings !== 'object') {
      return NextResponse.json({ 
        error: "Settings must be a valid object",
        code: "INVALID_SETTINGS_TYPE" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(globalSettings)
      .where(eq(globalSettings.id, 1))
      .limit(1);

    const currentTime = new Date().toISOString();

    if (existingRecord.length > 0) {
      // Update existing record
      const updated = await db.update(globalSettings)
        .set({
          settings,
          updatedAt: currentTime
        })
        .where(eq(globalSettings.id, 1))
        .returning();

      return NextResponse.json({ settings: updated[0].settings });
    } else {
      // Insert new record
      const created = await db.insert(globalSettings)
        .values({
          id: 1,
          settings,
          createdAt: currentTime,
          updatedAt: currentTime
        })
        .returning();

      return NextResponse.json({ settings: created[0].settings }, { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}