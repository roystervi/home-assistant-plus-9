import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { energyReadings } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte, sum, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const entityId = searchParams.get('entity_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const readingType = searchParams.get('reading_type');
    const groupBy = searchParams.get('group_by');

    let query = db.select().from(energyReadings);
    const conditions = [];

    // Filter by entity_id
    if (entityId) {
      conditions.push(eq(energyReadings.entityId, entityId));
    }

    // Filter by date range
    if (dateFrom) {
      conditions.push(gte(energyReadings.readingDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(energyReadings.readingDate, dateTo));
    }

    // Filter by reading type
    if (readingType) {
      if (!['main', 'device', 'manual'].includes(readingType)) {
        return NextResponse.json({ 
          error: "Invalid reading_type. Must be one of: main, device, manual",
          code: "INVALID_READING_TYPE" 
        }, { status: 400 });
      }
      conditions.push(eq(energyReadings.readingType, readingType));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Handle aggregation/grouping
    if (groupBy && ['daily', 'weekly', 'monthly'].includes(groupBy)) {
      let aggregateQuery;
      if (groupBy === 'daily') {
        aggregateQuery = db.select({
          date: energyReadings.readingDate,
          totalKwh: sum(energyReadings.dailyKwh),
          readingCount: count(energyReadings.id)
        }).from(energyReadings);
      } else if (groupBy === 'weekly') {
        aggregateQuery = db.select({
          totalKwh: sum(energyReadings.weeklyKwh),
          readingCount: count(energyReadings.id)
        }).from(energyReadings);
      } else if (groupBy === 'monthly') {
        aggregateQuery = db.select({
          totalKwh: sum(energyReadings.monthlyKwh),
          readingCount: count(energyReadings.id)
        }).from(energyReadings);
      }

      if (conditions.length > 0) {
        aggregateQuery = aggregateQuery.where(and(...conditions));
      }

      const aggregatedData = await aggregateQuery;
      return NextResponse.json(aggregatedData);
    }

    // Apply ordering and pagination
    const results = await query
      .orderBy(desc(energyReadings.readingDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { entity_id, friendly_name, reading_date, kwh_value, reading_type } = requestBody;

    // Validate required fields
    if (!entity_id) {
      return NextResponse.json({ 
        error: "entity_id is required",
        code: "MISSING_ENTITY_ID" 
      }, { status: 400 });
    }

    if (!reading_date) {
      return NextResponse.json({ 
        error: "reading_date is required",
        code: "MISSING_READING_DATE" 
      }, { status: 400 });
    }

    if (kwh_value === undefined || kwh_value === null) {
      return NextResponse.json({ 
        error: "kwh_value is required",
        code: "MISSING_KWH_VALUE" 
      }, { status: 400 });
    }

    if (!reading_type) {
      return NextResponse.json({ 
        error: "reading_type is required",
        code: "MISSING_READING_TYPE" 
      }, { status: 400 });
    }

    // Validate entity_id format
    if (typeof entity_id !== 'string' || entity_id.trim().length === 0) {
      return NextResponse.json({ 
        error: "entity_id must be a non-empty string",
        code: "INVALID_ENTITY_ID" 
      }, { status: 400 });
    }

    // Validate reading_date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(reading_date)) {
      return NextResponse.json({ 
        error: "reading_date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate date is actually valid
    const parsedDate = new Date(reading_date + 'T00:00:00Z');
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ 
        error: "reading_date must be a valid date",
        code: "INVALID_DATE" 
      }, { status: 400 });
    }

    // Validate kwh_value
    const kwhNumber = parseFloat(kwh_value);
    if (isNaN(kwhNumber) || kwhNumber < 0) {
      return NextResponse.json({ 
        error: "kwh_value must be a positive number",
        code: "INVALID_KWH_VALUE" 
      }, { status: 400 });
    }

    // Validate reading_type
    if (!['main', 'device', 'manual'].includes(reading_type)) {
      return NextResponse.json({ 
        error: "reading_type must be one of: main, device, manual",
        code: "INVALID_READING_TYPE" 
      }, { status: 400 });
    }

    // Check for duplicate entity_id + reading_date combination
    const existingReading = await db.select()
      .from(energyReadings)
      .where(and(
        eq(energyReadings.entityId, entity_id),
        eq(energyReadings.readingDate, reading_date)
      ))
      .limit(1);

    if (existingReading.length > 0) {
      return NextResponse.json({ 
        error: "A reading for this entity_id and reading_date already exists",
        code: "DUPLICATE_READING" 
      }, { status: 409 });
    }

    // Auto-generate friendly_name if not provided
    let finalFriendlyName = friendly_name;
    if (!finalFriendlyName) {
      finalFriendlyName = entity_id.replace('sensor.', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Calculate usage values based on previous readings
    let dailyKwh = 0;
    let weeklyKwh = 0;
    let monthlyKwh = 0;

    // Get previous day's reading for daily calculation
    const previousDayDate = new Date(parsedDate);
    previousDayDate.setDate(previousDayDate.getDate() - 1);
    const previousDayStr = previousDayDate.toISOString().split('T')[0];

    const previousDayReading = await db.select()
      .from(energyReadings)
      .where(and(
        eq(energyReadings.entityId, entity_id),
        eq(energyReadings.readingDate, previousDayStr)
      ))
      .limit(1);

    if (previousDayReading.length > 0) {
      dailyKwh = Math.max(0, kwhNumber - previousDayReading[0].kwhValue);
    }

    // Get weekly readings (last 7 days) for weekly calculation
    const weekAgoDate = new Date(parsedDate);
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgoStr = weekAgoDate.toISOString().split('T')[0];

    const weeklyReadings = await db.select()
      .from(energyReadings)
      .where(and(
        eq(energyReadings.entityId, entity_id),
        gte(energyReadings.readingDate, weekAgoStr),
        lte(energyReadings.readingDate, reading_date)
      ));

    if (weeklyReadings.length > 0) {
      weeklyKwh = weeklyReadings.reduce((sum, reading) => sum + reading.dailyKwh, 0) + dailyKwh;
    }

    // Get monthly readings for monthly calculation
    const monthStart = reading_date.substring(0, 7) + '-01'; // First day of the month
    const monthlyReadings = await db.select()
      .from(energyReadings)
      .where(and(
        eq(energyReadings.entityId, entity_id),
        gte(energyReadings.readingDate, monthStart),
        lte(energyReadings.readingDate, reading_date)
      ));

    if (monthlyReadings.length > 0) {
      monthlyKwh = monthlyReadings.reduce((sum, reading) => sum + reading.dailyKwh, 0) + dailyKwh;
    }

    // Create new reading
    const newReading = await db.insert(energyReadings)
      .values({
        entityId: entity_id.trim(),
        friendlyName: finalFriendlyName,
        readingDate: reading_date,
        kwhValue: kwhNumber,
        dailyKwh: dailyKwh,
        weeklyKwh: weeklyKwh,
        monthlyKwh: monthlyKwh,
        readingType: reading_type,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newReading[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}