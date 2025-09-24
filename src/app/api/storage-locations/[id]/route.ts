import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { nvrStorageLocations } from '@/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

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
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 });
    }

    return NextResponse.json(record[0]);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Check if record exists
    const existingRecord = await db.select()
      .from(nvrStorageLocations)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 });
    }

    // Validate type enum if provided
    const validTypes = ['local', 'network', 'cloud'];
    if (requestBody.type && !validTypes.includes(requestBody.type)) {
      return NextResponse.json({
        error: "Type must be one of: local, network, cloud",
        code: "INVALID_TYPE"
      }, { status: 400 });
    }

    // Check unique constraints for name if being updated
    if (requestBody.name) {
      requestBody.name = requestBody.name.trim();
      const nameConflict = await db.select()
        .from(nvrStorageLocations)
        .where(and(
          eq(nvrStorageLocations.name, requestBody.name),
          ne(nvrStorageLocations.id, parseInt(id))
        ))
        .limit(1);

      if (nameConflict.length > 0) {
        return NextResponse.json({
          error: "A storage location with this name already exists",
          code: "NAME_ALREADY_EXISTS"
        }, { status: 409 });
      }
    }

    // Check unique constraints for path if being updated
    if (requestBody.path) {
      requestBody.path = requestBody.path.trim();
      const pathConflict = await db.select()
        .from(nvrStorageLocations)
        .where(and(
          eq(nvrStorageLocations.path, requestBody.path),
          ne(nvrStorageLocations.id, parseInt(id))
        ))
        .limit(1);

      if (pathConflict.length > 0) {
        return NextResponse.json({
          error: "A storage location with this path already exists",
          code: "PATH_ALREADY_EXISTS"
        }, { status: 409 });
      }
    }

    // Prepare update data, only including provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (requestBody.name !== undefined) updateData.name = requestBody.name;
    if (requestBody.path !== undefined) updateData.path = requestBody.path;
    if (requestBody.type !== undefined) updateData.type = requestBody.type;
    if (requestBody.capacityGb !== undefined) updateData.capacityGb = requestBody.capacityGb;
    if (requestBody.usedGb !== undefined) updateData.usedGb = requestBody.usedGb;
    if (requestBody.enabled !== undefined) updateData.enabled = requestBody.enabled;

    const updated = await db.update(nvrStorageLocations)
      .set(updateData)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(nvrStorageLocations)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 });
    }

    const deleted = await db.delete(nvrStorageLocations)
      .where(eq(nvrStorageLocations.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Storage location not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Storage location deleted successfully',
      deletedRecord: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}