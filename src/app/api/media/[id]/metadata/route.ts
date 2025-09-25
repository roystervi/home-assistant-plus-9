import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { media } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import fs from 'fs/promises';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Validate ID parameter
    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Get media record with user scoping
    const mediaRecord = await db.select()
      .from(media)
      .where(and(
        eq(media.id, parseInt(id)),
        eq(media.userId, user.id)
      ))
      .limit(1);

    if (mediaRecord.length === 0) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

    const mediaFile = mediaRecord[0];

    // Try to get file size if file exists
    let fileSize = null;
    try {
      const stats = await fs.stat(mediaFile.filePath);
      fileSize = stats.size;
    } catch (error) {
      // File might not exist or be accessible, continue without size
      console.warn('Could not get file size for media ID:', id, error);
    }

    // Prepare metadata response
    const metadata = {
      id: mediaFile.id,
      name: mediaFile.name,
      type: mediaFile.type,
      filePath: mediaFile.filePath,
      duration: mediaFile.duration,
      artist: mediaFile.artist,
      album: mediaFile.album,
      genre: mediaFile.genre,
      year: mediaFile.year,
      folder: mediaFile.folder,
      userId: mediaFile.userId,
      createdAt: mediaFile.createdAt,
      updatedAt: mediaFile.updatedAt,
      // Computed fields
      ...(fileSize !== null && { fileSize }),
      fileSizeFormatted: fileSize ? formatFileSize(fileSize) : null,
      durationFormatted: formatDuration(mediaFile.duration)
    };

    // Set response headers for download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="metadata-${mediaFile.name}-${id}.json"`);

    return new NextResponse(JSON.stringify(metadata, null, 2), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('GET metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}