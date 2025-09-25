import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { media } from '@/db/schema';
import { like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // audio or video filter
    const folder = searchParams.get('folder'); // folder filter

    // Build query
    let query = db.select().from(media);
    
    // Build conditions array
    const conditions = [];
    
    // Type filter
    if (type && (type === 'audio' || type === 'video')) {
      conditions.push(like(media.type, type));
    }
    
    // Folder filter
    if (folder) {
      conditions.push(like(media.folder, `%${folder}%`));
    }
    
    // Search filter (name or artist)
    if (search) {
      const searchCondition = or(
        like(media.name, `%${search}%`),
        like(media.artist, `%${search}%`)
      );
      conditions.push(searchCondition);
    }
    
    // Apply conditions if any exist
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Apply ordering, pagination and execute
    const results = await query
      .orderBy(desc(media.createdAt))
      .limit(limit)
      .offset(offset);

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
      name,
      type,
      filePath,
      duration = 0,
      artist,
      album,
      genre,
      year,
      folder,
      userId = 'test_user'
    } = requestBody;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        error: "Name is required and must be a non-empty string"
      }, { status: 400 });
    }

    if (!type || (type !== 'audio' && type !== 'video')) {
      return NextResponse.json({ 
        error: "Type is required and must be 'audio' or 'video'"
      }, { status: 400 });
    }

    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return NextResponse.json({ 
        error: "File path is required"
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
      userId: userId,
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