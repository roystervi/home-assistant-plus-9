import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { media } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ 
      headers: Object.fromEntries(request.headers.entries())
    });
    
    if (!session || !session.user) {
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(media)
        .where(and(eq(media.id, parseInt(id)), eq(media.userId, user.id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filtering
    let query = db.select().from(media);
    const conditions = [eq(media.userId, user.id)];

    // Type filter
    if (type && (type === 'audio' || type === 'video')) {
      conditions.push(eq(media.type, type));
    }

    // Folder filter
    if (folder) {
      conditions.push(eq(media.folder, folder));
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(media.name, `%${search}%`),
          like(media.artist, `%${search}%`),
          like(media.album, `%${search}%`)
        )
      );
    }

    const results = await query
      .where(and(...conditions))
      .orderBy(desc(media.createdAt))
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
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      name,
      type,
      filePath,
      duration = 0,
      artist,
      album,
      genre,
      year,
      folder
    } = requestBody;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        error: "Name is required and must be a non-empty string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!type || (type !== 'audio' && type !== 'video')) {
      return NextResponse.json({ 
        error: "Type is required and must be 'audio' or 'video'",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return NextResponse.json({ 
        error: "File path is required",
        code: "MISSING_FILE_PATH" 
      }, { status: 400 });
    }

    if (duration < 0) {
      return NextResponse.json({ 
        error: "Duration must be a non-negative integer",
        code: "INVALID_DURATION" 
      }, { status: 400 });
    }

    // File extension validation
    const fileExtension = filePath.toLowerCase().split('.').pop();
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
    const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'];

    if (type === 'audio' && !audioExtensions.includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: "File extension does not match audio type",
        code: "INVALID_AUDIO_EXTENSION" 
      }, { status: 400 });
    }

    if (type === 'video' && !videoExtensions.includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: "File extension does not match video type",
        code: "INVALID_VIDEO_EXTENSION" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const insertData = {
      name: name.trim(),
      type,
      filePath: filePath.trim(),
      duration: parseInt(duration) || 0,
      artist: artist?.trim() || null,
      album: album?.trim() || null,
      genre: genre?.trim() || null,
      year: year ? parseInt(year) : null,
      folder: folder?.trim() || null,
      userId: user.id,
      createdAt: now,
      updatedAt: now
    };

    const newRecord = await db.insert(media)
      .values(insertData)
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user
    const existing = await db.select()
      .from(media)
      .where(and(eq(media.id, parseInt(id)), eq(media.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const {
      name,
      type,
      filePath,
      duration,
      artist,
      album,
      genre,
      year,
      folder
    } = requestBody;

    // Validation for provided fields
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ 
        error: "Name must be a non-empty string",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

    if (type !== undefined && type !== 'audio' && type !== 'video') {
      return NextResponse.json({ 
        error: "Type must be 'audio' or 'video'",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (filePath !== undefined && (typeof filePath !== 'string' || filePath.trim() === '')) {
      return NextResponse.json({ 
        error: "File path must be a non-empty string",
        code: "INVALID_FILE_PATH" 
      }, { status: 400 });
    }

    if (duration !== undefined && duration < 0) {
      return NextResponse.json({ 
        error: "Duration must be a non-negative integer",
        code: "INVALID_DURATION" 
      }, { status: 400 });
    }

    // File extension validation if type or filePath is being updated
    const updatedType = type || existing[0].type;
    const updatedFilePath = filePath || existing[0].filePath;
    const fileExtension = updatedFilePath.toLowerCase().split('.').pop();
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
    const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'];

    if (updatedType === 'audio' && !audioExtensions.includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: "File extension does not match audio type",
        code: "INVALID_AUDIO_EXTENSION" 
      }, { status: 400 });
    }

    if (updatedType === 'video' && !videoExtensions.includes(fileExtension || '')) {
      return NextResponse.json({ 
        error: "File extension does not match video type",
        code: "INVALID_VIDEO_EXTENSION" 
      }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (filePath !== undefined) updates.filePath = filePath.trim();
    if (duration !== undefined) updates.duration = parseInt(duration) || 0;
    if (artist !== undefined) updates.artist = artist?.trim() || null;
    if (album !== undefined) updates.album = album?.trim() || null;
    if (genre !== undefined) updates.genre = genre?.trim() || null;
    if (year !== undefined) updates.year = year ? parseInt(year) : null;
    if (folder !== undefined) updates.folder = folder?.trim() || null;

    const updated = await db.update(media)
      .set(updates)
      .where(and(eq(media.id, parseInt(id)), eq(media.userId, user.id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists and belongs to user before deleting
    const existing = await db.select()
      .from(media)
      .where(and(eq(media.id, parseInt(id)), eq(media.userId, user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const deleted = await db.delete(media)
      .where(and(eq(media.id, parseInt(id)), eq(media.userId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Media deleted successfully',
      deletedRecord: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}