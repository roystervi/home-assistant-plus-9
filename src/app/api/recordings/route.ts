import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { recordings, cameras } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const cameraId = searchParams.get('cameraId');

    let query = db
      .select({
        id: recordings.id,
        cameraId: recordings.cameraId,
        cameraName: cameras.name,
        filename: recordings.filename,
        timestamp: recordings.timestamp,
        duration: recordings.duration,
        size: recordings.size,
        trigger: recordings.trigger,
        createdAt: recordings.createdAt,
      })
      .from(recordings)
      .leftJoin(cameras, eq(recordings.cameraId, cameras.id))
      .orderBy(desc(recordings.createdAt));

    if (cameraId) {
      const cameraIdInt = parseInt(cameraId);
      if (isNaN(cameraIdInt)) {
        return NextResponse.json({
          error: "Invalid camera ID",
          code: "INVALID_CAMERA_ID"
        }, { status: 400 });
      }
      query = query.where(eq(recordings.cameraId, cameraIdInt));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
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
    const { 
      cameraId, 
      filename, 
      timestamp, 
      duration = 0, 
      size = 0.00, 
      trigger = 'manual' 
    } = requestBody;

    // Validate required fields
    if (!cameraId) {
      return NextResponse.json({
        error: "Camera ID is required",
        code: "MISSING_CAMERA_ID"
      }, { status: 400 });
    }

    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      return NextResponse.json({
        error: "Filename is required and must be a non-empty string",
        code: "INVALID_FILENAME"
      }, { status: 400 });
    }

    if (filename.length > 255) {
      return NextResponse.json({
        error: "Filename must not exceed 255 characters",
        code: "FILENAME_TOO_LONG"
      }, { status: 400 });
    }

    if (!timestamp || typeof timestamp !== 'string') {
      return NextResponse.json({
        error: "Timestamp is required and must be a valid ISO datetime string",
        code: "MISSING_TIMESTAMP"
      }, { status: 400 });
    }

    // Validate timestamp format
    const timestampDate = new Date(timestamp);
    if (isNaN(timestampDate.getTime())) {
      return NextResponse.json({
        error: "Timestamp must be a valid ISO datetime string",
        code: "INVALID_TIMESTAMP"
      }, { status: 400 });
    }

    // Validate cameraId is integer
    const cameraIdInt = parseInt(cameraId);
    if (isNaN(cameraIdInt)) {
      return NextResponse.json({
        error: "Camera ID must be a valid integer",
        code: "INVALID_CAMERA_ID"
      }, { status: 400 });
    }

    // Validate duration
    if (duration !== undefined && (typeof duration !== 'number' || duration < 0)) {
      return NextResponse.json({
        error: "Duration must be a non-negative integer",
        code: "INVALID_DURATION"
      }, { status: 400 });
    }

    // Validate size
    if (size !== undefined && (typeof size !== 'number' || size < 0)) {
      return NextResponse.json({
        error: "Size must be a non-negative number",
        code: "INVALID_SIZE"
      }, { status: 400 });
    }

    // Validate trigger
    const validTriggers = ['motion', 'schedule', 'manual'];
    if (!validTriggers.includes(trigger)) {
      return NextResponse.json({
        error: "Trigger must be one of: motion, schedule, manual",
        code: "INVALID_TRIGGER"
      }, { status: 400 });
    }

    // Check if camera exists
    const existingCamera = await db
      .select()
      .from(cameras)
      .where(eq(cameras.id, cameraIdInt))
      .limit(1);

    if (existingCamera.length === 0) {
      return NextResponse.json({
        error: "Camera not found",
        code: "CAMERA_NOT_FOUND"
      }, { status: 404 });
    }

    // Create recording
    const newRecording = await db
      .insert(recordings)
      .values({
        cameraId: cameraIdInt,
        filename: filename.trim(),
        timestamp: timestamp,
        duration: duration,
        size: size,
        trigger: trigger,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newRecording[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
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

    const recordingId = parseInt(id);

    // Check if recording exists
    const existingRecording = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);

    if (existingRecording.length === 0) {
      return NextResponse.json({
        error: "Recording not found",
        code: "RECORDING_NOT_FOUND"
      }, { status: 404 });
    }

    // Delete recording
    const deleted = await db
      .delete(recordings)
      .where(eq(recordings.id, recordingId))
      .returning();

    return NextResponse.json({
      message: "Recording deleted successfully",
      recording: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}