import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cameras } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single camera by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      const camera = await db.select()
        .from(cameras)
        .where(eq(cameras.id, parseInt(id)))
        .limit(1);

      if (camera.length === 0) {
        return NextResponse.json({
          error: 'Camera not found',
          code: 'CAMERA_NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json(camera[0]);
    }

    // List cameras with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query = db.select().from(cameras);

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(like(cameras.name, `%${search}%`));
    }

    if (status) {
      if (!['online', 'offline', 'connecting'].includes(status)) {
        return NextResponse.json({
          error: 'Invalid status. Must be one of: online, offline, connecting',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(cameras.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(cameras.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET cameras error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { name, connectionType, url, username, password, format, resolution, haEntity } = requestBody;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({
        error: 'Name is required and must be a non-empty string',
        code: 'INVALID_NAME'
      }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({
        error: 'Name must not exceed 100 characters',
        code: 'NAME_TOO_LONG'
      }, { status: 400 });
    }

    if (!connectionType || !['rtsp', 'onvif', 'http', 'rtmp'].includes(connectionType)) {
      return NextResponse.json({
        error: 'Connection type is required and must be one of: rtsp, onvif, http, rtmp',
        code: 'INVALID_CONNECTION_TYPE'
      }, { status: 400 });
    }

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({
        error: 'URL is required and must be a non-empty string',
        code: 'INVALID_URL'
      }, { status: 400 });
    }

    if (url.length > 500) {
      return NextResponse.json({
        error: 'URL must not exceed 500 characters',
        code: 'URL_TOO_LONG'
      }, { status: 400 });
    }

    // Optional field validations
    if (username && (typeof username !== 'string' || username.length > 100)) {
      return NextResponse.json({
        error: 'Username must be a string and not exceed 100 characters',
        code: 'INVALID_USERNAME'
      }, { status: 400 });
    }

    if (password && (typeof password !== 'string' || password.length > 100)) {
      return NextResponse.json({
        error: 'Password must be a string and not exceed 100 characters',
        code: 'INVALID_PASSWORD'
      }, { status: 400 });
    }

    if (format && (typeof format !== 'string' || format.length > 100)) {
      return NextResponse.json({
        error: 'Format must be a string and not exceed 100 characters',
        code: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    if (resolution && (typeof resolution !== 'string' || resolution.length > 100)) {
      return NextResponse.json({
        error: 'Resolution must be a string and not exceed 100 characters',
        code: 'INVALID_RESOLUTION'
      }, { status: 400 });
    }

    if (haEntity && (typeof haEntity !== 'string' || haEntity.length > 100)) {
      return NextResponse.json({
        error: 'HA Entity must be a string and not exceed 100 characters',
        code: 'INVALID_HA_ENTITY'
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    
    const newCamera = await db.insert(cameras)
      .values({
        name: name.trim(),
        connectionType,
        url: url.trim(),
        username: username?.trim() || null,
        password: password?.trim() || null,
        status: 'connecting',
        format: format?.trim() || null,
        resolution: resolution?.trim() || null,
        haEntity: haEntity?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newCamera[0], { status: 201 });
  } catch (error) {
    console.error('POST cameras error:', error);
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
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { name, connectionType, url, username, password, status, format, resolution, haEntity } = requestBody;

    // Check if camera exists
    const existingCamera = await db.select()
      .from(cameras)
      .where(eq(cameras.id, parseInt(id)))
      .limit(1);

    if (existingCamera.length === 0) {
      return NextResponse.json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      }, { status: 404 });
    }

    // Validation
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({
          error: 'Name must be a non-empty string',
          code: 'INVALID_NAME'
        }, { status: 400 });
      }

      if (name.length > 100) {
        return NextResponse.json({
          error: 'Name must not exceed 100 characters',
          code: 'NAME_TOO_LONG'
        }, { status: 400 });
      }
    }

    if (connectionType !== undefined && !['rtsp', 'onvif', 'http', 'rtmp'].includes(connectionType)) {
      return NextResponse.json({
        error: 'Connection type must be one of: rtsp, onvif, http, rtmp',
        code: 'INVALID_CONNECTION_TYPE'
      }, { status: 400 });
    }

    if (url !== undefined) {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return NextResponse.json({
          error: 'URL must be a non-empty string',
          code: 'INVALID_URL'
        }, { status: 400 });
      }

      if (url.length > 500) {
        return NextResponse.json({
          error: 'URL must not exceed 500 characters',
          code: 'URL_TOO_LONG'
        }, { status: 400 });
      }
    }

    if (status !== undefined && !['online', 'offline', 'connecting'].includes(status)) {
      return NextResponse.json({
        error: 'Status must be one of: online, offline, connecting',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Optional field validations
    if (username !== undefined && username !== null && (typeof username !== 'string' || username.length > 100)) {
      return NextResponse.json({
        error: 'Username must be a string and not exceed 100 characters',
        code: 'INVALID_USERNAME'
      }, { status: 400 });
    }

    if (password !== undefined && password !== null && (typeof password !== 'string' || password.length > 100)) {
      return NextResponse.json({
        error: 'Password must be a string and not exceed 100 characters',
        code: 'INVALID_PASSWORD'
      }, { status: 400 });
    }

    if (format !== undefined && format !== null && (typeof format !== 'string' || format.length > 100)) {
      return NextResponse.json({
        error: 'Format must be a string and not exceed 100 characters',
        code: 'INVALID_FORMAT'
      }, { status: 400 });
    }

    if (resolution !== undefined && resolution !== null && (typeof resolution !== 'string' || resolution.length > 100)) {
      return NextResponse.json({
        error: 'Resolution must be a string and not exceed 100 characters',
        code: 'INVALID_RESOLUTION'
      }, { status: 400 });
    }

    if (haEntity !== undefined && haEntity !== null && (typeof haEntity !== 'string' || haEntity.length > 100)) {
      return NextResponse.json({
        error: 'HA Entity must be a string and not exceed 100 characters',
        code: 'INVALID_HA_ENTITY'
      }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (connectionType !== undefined) updateData.connectionType = connectionType;
    if (url !== undefined) updateData.url = url.trim();
    if (username !== undefined) updateData.username = username?.trim() || null;
    if (password !== undefined) updateData.password = password?.trim() || null;
    if (status !== undefined) updateData.status = status;
    if (format !== undefined) updateData.format = format?.trim() || null;
    if (resolution !== undefined) updateData.resolution = resolution?.trim() || null;
    if (haEntity !== undefined) updateData.haEntity = haEntity?.trim() || null;

    const updatedCamera = await db.update(cameras)
      .set(updateData)
      .where(eq(cameras.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedCamera[0]);
  } catch (error) {
    console.error('PUT cameras error:', error);
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
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    // Check if camera exists before deleting
    const existingCamera = await db.select()
      .from(cameras)
      .where(eq(cameras.id, parseInt(id)))
      .limit(1);

    if (existingCamera.length === 0) {
      return NextResponse.json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      }, { status: 404 });
    }

    const deletedCamera = await db.delete(cameras)
      .where(eq(cameras.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Camera deleted successfully',
      camera: deletedCamera[0]
    });
  } catch (error) {
    console.error('DELETE cameras error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}