import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { energyReadings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const requestBody = await request.json();
    const { 
      entity_id, 
      friendly_name, 
      reading_date, 
      kwh_value, 
      reading_type, 
      daily_kwh, 
      weekly_kwh, 
      monthly_kwh 
    } = requestBody;

    // Validate reading_date format (YYYY-MM-DD)
    if (reading_date && !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
      return NextResponse.json({ 
        error: "Reading date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate kwh_value is positive number
    if (kwh_value !== undefined && (isNaN(parseFloat(kwh_value)) || parseFloat(kwh_value) < 0)) {
      return NextResponse.json({ 
        error: "KWH value must be a positive number",
        code: "INVALID_KWH_VALUE" 
      }, { status: 400 });
    }

    // Validate reading_type
    if (reading_type && !['main', 'device', 'manual'].includes(reading_type)) {
      return NextResponse.json({ 
        error: "Reading type must be one of: main, device, manual",
        code: "INVALID_READING_TYPE" 
      }, { status: 400 });
    }

    // Validate numeric fields
    if (daily_kwh !== undefined && (isNaN(parseFloat(daily_kwh)) || parseFloat(daily_kwh) < 0)) {
      return NextResponse.json({ 
        error: "Daily KWH must be a positive number",
        code: "INVALID_DAILY_KWH" 
      }, { status: 400 });
    }

    if (weekly_kwh !== undefined && (isNaN(parseFloat(weekly_kwh)) || parseFloat(weekly_kwh) < 0)) {
      return NextResponse.json({ 
        error: "Weekly KWH must be a positive number",
        code: "INVALID_WEEKLY_KWH" 
      }, { status: 400 });
    }

    if (monthly_kwh !== undefined && (isNaN(parseFloat(monthly_kwh)) || parseFloat(monthly_kwh) < 0)) {
      return NextResponse.json({ 
        error: "Monthly KWH must be a positive number",
        code: "INVALID_MONTHLY_KWH" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(energyReadings)
      .where(eq(energyReadings.id, parsedId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Energy reading not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (entity_id !== undefined) updateData.entityId = entity_id.toString().trim();
    if (friendly_name !== undefined) updateData.friendlyName = friendly_name.toString().trim();
    if (reading_date !== undefined) updateData.readingDate = reading_date;
    if (kwh_value !== undefined) updateData.kwhValue = parseFloat(kwh_value);
    if (reading_type !== undefined) updateData.readingType = reading_type;
    if (daily_kwh !== undefined) updateData.dailyKwh = parseFloat(daily_kwh);
    if (weekly_kwh !== undefined) updateData.weeklyKwh = parseFloat(weekly_kwh);
    if (monthly_kwh !== undefined) updateData.monthlyKwh = parseFloat(monthly_kwh);

    // Update the record
    const updated = await db.update(energyReadings)
      .set(updateData)
      .where(eq(energyReadings.id, parsedId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update energy reading',
        code: "UPDATE_FAILED" 
      }, { status: 500 });
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    // Check if record exists
    const existingRecord = await db.select()
      .from(energyReadings)
      .where(eq(energyReadings.id, parsedId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Energy reading not found',
        code: "RECORD_NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete the record
    const deleted = await db.delete(energyReadings)
      .where(eq(energyReadings.id, parsedId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete energy reading',
        code: "DELETE_FAILED" 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Energy reading deleted successfully',
      deletedRecord: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}