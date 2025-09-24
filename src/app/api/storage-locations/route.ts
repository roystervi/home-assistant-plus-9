import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { nvrStorageLocations } from '@/db/schema';
import { eq, like, or, sum, count } from 'drizzle-orm';

const VALID_TYPES = ['local', 'network', 'cloud'] as const;
type StorageType = typeof VALID_TYPES[number];

function validateStorageType(type: string): type is StorageType {
  return VALID_TYPES.includes(type as StorageType);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(nvrStorageLocations)
        .where(eq(nvrStorageLocations.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ 
          error: 'Storage location not found' 
        }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with pagination, search, and aggregates
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    let query = db.select().from(nvrStorageLocations);

    if (search) {
      query = query.where(
        or(
          like(nvrStorageLocations.name, `%${search}%`),
          like(nvrStorageLocations.path, `%${search}%`)
        )
      );
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(nvrStorageLocations.createdAt);

    // Get aggregate totals
    const aggregates = await db.select({
      totalUsedGb: sum(nvrStorageLocations.usedGb),
      totalCapacityGb: sum(nvrStorageLocations.capacityGb),
      totalCount: count(nvrStorageLocations.id)
    }).from(nvrStorageLocations);

    const summary = {
      totalUsedGb: aggregates[0]?.totalUsedGb || 0,
      totalCapacityGb: aggregates[0]?.totalCapacityGb || 0,
      totalCount: aggregates[0]?.totalCount || 0
    };

    return NextResponse.json({
      data: results,
      summary,
      pagination: {
        limit,
        offset,
        total: summary.totalCount
      }
    });

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
    const { name, path, type, capacityGb, usedGb, enabled } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ 
        error: "Path is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ 
        error: "Type is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate type enum
    if (!validateStorageType(type)) {
      return NextResponse.json({ 
        error: "Type must be one of: local, network, cloud",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Check for unique constraints
    const existingName = await db.select()
      .from(nvrStorageLocations)
      .where(eq(nvrStorageLocations.name, name.trim()))
      .limit(1);

    if (existingName.length > 0) {
      return NextResponse.json({ 
        error: "Storage location name must be unique",
        code: "NAME_ALREADY_EXISTS" 
      }, { status: 409 });
    }

    const existingPath = await db.select()
      .from(nvrStorageLocations)
      .where(eq(nvrStorageLocations.path, path.trim()))
      .limit(1);

    if (existingPath.length > 0) {
      return NextResponse.json({ 
        error: "Storage location path must be unique",
        code: "PATH_ALREADY_EXISTS" 
      }, { status: 409 });
    }

    const newRecord = await db.insert(nvrStorageLocations)
      .values({
        name: name.trim(),
        path: path.trim(),
        type,
        capacityGb: capacityGb || 0,
        usedGb: usedGb || 0,
        enabled: enabled !== undefined ? enabled : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violations from database
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('name')) {
        return NextResponse.json({ 
          error: "Storage location name must be unique",
          code: "NAME_ALREADY_EXISTS" 
        }, { status: 409 });
      }
      if (error.message.includes('path')) {
        return NextResponse.json({ 
          error: "Storage location path must be unique",
          code: "PATH_ALREADY_EXISTS" 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, path, type, capacityGb, usedGb, enabled } = body;

    // Check if record exists
    const existing = await db.select()
      .from(nvrStorageLocations)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Storage location not found' 
      }, { status: 404 });
    }

    // Validate type enum if provided
    if (type && !validateStorageType(type)) {
      return NextResponse.json({ 
        error: "Type must be one of: local, network, cloud",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    // Check for unique constraints if updating name or path
    if (name && name.trim() !== existing[0].name) {
      const existingName = await db.select()
        .from(nvrStorageLocations)
        .where(eq(nvrStorageLocations.name, name.trim()))
        .limit(1);

      if (existingName.length > 0) {
        return NextResponse.json({ 
          error: "Storage location name must be unique",
          code: "NAME_ALREADY_EXISTS" 
        }, { status: 409 });
      }
    }

    if (path && path.trim() !== existing[0].path) {
      const existingPath = await db.select()
        .from(nvrStorageLocations)
        .where(eq(nvrStorageLocations.path, path.trim()))
        .limit(1);

      if (existingPath.length > 0) {
        return NextResponse.json({ 
          error: "Storage location path must be unique",
          code: "PATH_ALREADY_EXISTS" 
        }, { status: 409 });
      }
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (path !== undefined) updates.path = path.trim();
    if (type !== undefined) updates.type = type;
    if (capacityGb !== undefined) updates.capacityGb = capacityGb;
    if (usedGb !== undefined) updates.usedGb = usedGb;
    if (enabled !== undefined) updates.enabled = enabled;

    const updated = await db.update(nvrStorageLocations)
      .set(updates)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Storage location not found' 
      }, { status: 404 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    
    // Handle unique constraint violations from database
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('name')) {
        return NextResponse.json({ 
          error: "Storage location name must be unique",
          code: "NAME_ALREADY_EXISTS" 
        }, { status: 409 });
      }
      if (error.message.includes('path')) {
        return NextResponse.json({ 
          error: "Storage location path must be unique",
          code: "PATH_ALREADY_EXISTS" 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const deleted = await db.delete(nvrStorageLocations)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Storage location not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Storage location deleted successfully',
      deleted: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}