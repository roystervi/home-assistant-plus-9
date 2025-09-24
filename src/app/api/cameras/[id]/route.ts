import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cameras, recordings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid camera ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const cameraId = parseInt(id);

    // Check if camera exists
    const existingCamera = await db.select()
      .from(cameras)
      .where(eq(cameras.id, cameraId))
      .limit(1);

    if (existingCamera.length === 0) {
      return NextResponse.json({
        error: "Camera not found",
        code: "CAMERA_NOT_FOUND"
      }, { status: 404 });
    }

    const requestBody = await request.json();
    const {
      name,
      connectionType,
      url,
      username,
      password,
      status,
      format,
      resolution,
      haEntity
    } = requestBody;

    // Validate provided fields
    const validConnectionTypes = ['rtsp', 'onvif', 'http', 'rtmp'];
    const validStatuses = ['online', 'offline', 'connecting'];

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({
          error: "Name must be a non-empty string",
          code: "INVALID_NAME"
        }, { status: 400 });
      }
      if (name.trim().length > 100) {
        return NextResponse.json({
          error: "Name must be 100 characters or less",
          code: "NAME_TOO_LONG"
        }, { status: 400 });
      }
    }

    if (connectionType !== undefined) {
      if (!validConnectionTypes.includes(connectionType)) {
        return NextResponse.json({
          error: `Connection type must be one of: ${validConnectionTypes.join(', ')}`,
          code: "INVALID_CONNECTION_TYPE"
        }, { status: 400 });
      }
    }

    if (url !== undefined) {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return NextResponse.json({
          error: "URL must be a non-empty string",
          code: "INVALID_URL"
        }, { status: 400 });
      }
      if (url.trim().length > 500) {
        return NextResponse.json({
          error: "URL must be 500 characters or less",
          code: "URL_TOO_LONG"
        }, { status: 400 });
      }
    }

    if (username !== undefined && username !== null) {
      if (typeof username !== 'string' || username.length > 100) {
        return NextResponse.json({
          error: "Username must be a string of 100 characters or less",
          code: "INVALID_USERNAME"
        }, { status: 400 });
      }
    }

    if (password !== undefined && password !== null) {
      if (typeof password !== 'string' || password.length > 100) {
        return NextResponse.json({
          error: "Password must be a string of 100 characters or less",
          code: "INVALID_PASSWORD"
        }, { status: 400 });
      }
    }

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          error: `Status must be one of: ${validStatuses.join(', ')}`,
          code: "INVALID_STATUS"
        }, { status: 400 });
      }
    }

    if (format !== undefined && format !== null) {
      if (typeof format !== 'string' || format.length > 100) {
        return NextResponse.json({
          error: "Format must be a string of 100 characters or less",
          code: "INVALID_FORMAT"
        }, { status: 400 });
      }
    }

    if (resolution !== undefined && resolution !== null) {
      if (typeof resolution !== 'string' || resolution.length > 100) {
        return NextResponse.json({
          error: "Resolution must be a string of 100 characters or less",
          code: "INVALID_RESOLUTION"
        }, { status: 400 });
      }
    }

    if (haEntity !== undefined && haEntity !== null) {
      if (typeof haEntity !== 'string' || haEntity.length > 100) {
        return NextResponse.json({
          error: "HA Entity must be a string of 100 characters or less",
          code: "INVALID_HA_ENTITY"
        }, { status: 400 });
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (connectionType !== undefined) updateData.connectionType = connectionType;
    if (url !== undefined) updateData.url = url.trim();
    if (username !== undefined) updateData.username = username ? username.trim() : username;
    if (password !== undefined) updateData.password = password ? password.trim() : password;
    if (status !== undefined) updateData.status = status;
    if (format !== undefined) updateData.format = format ? format.trim() : format;
    if (resolution !== undefined) updateData.resolution = resolution ? resolution.trim() : resolution;
    if (haEntity !== undefined) updateData.haEntity = haEntity ? haEntity.trim() : haEntity;

    // Update camera
    const updatedCamera = await db.update(cameras)
      .set(updateData)
      .where(eq(cameras.id, cameraId))
      .returning();

    if (updatedCamera.length === 0) {
      return NextResponse.json({
        error: "Failed to update camera",
        code: "UPDATE_FAILED"
      }, { status: 500 });
    }

    return NextResponse.json(updatedCamera[0], { status: 200 });

  } catch (error) {
    console.error('PUT camera error:', error);
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: "Valid camera ID is required",
        code: "INVALID_ID"
      }, { status: 400 });
    }

    const cameraId = parseInt(id);

    // Check if camera exists
    const existingCamera = await db.select()
      .from(cameras)
      .where(eq(cameras.id, cameraId))
      .limit(1);

    if (existingCamera.length === 0) {
      return NextResponse.json({
        error: "Camera not found",
        code: "CAMERA_NOT_FOUND"
      }, { status: 404 });
    }

    // CASCADE DELETE: First delete all associated recordings
    const deletedRecordings = await db.delete(recordings)
      .where(eq(recordings.cameraId, cameraId))
      .returning();

    // Then delete the camera
    const deletedCamera = await db.delete(cameras)
      .where(eq(cameras.id, cameraId))
      .returning();

    if (deletedCamera.length === 0) {
      return NextResponse.json({
        error: "Failed to delete camera",
        code: "DELETE_FAILED"
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Camera deleted successfully",
      deletedCamera: deletedCamera[0],
      deletedRecordingsCount: deletedRecordings.length
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE camera error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}