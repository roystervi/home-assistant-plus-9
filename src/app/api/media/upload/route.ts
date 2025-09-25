import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { media } from '@/db/schema';
import { auth } from '@/lib/auth';
import { parseFile } from 'music-metadata';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

// File type configurations
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv'];
const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/aac', 'audio/ogg'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'];

// Size limits in bytes
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

interface MediaMetadata {
  name: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  duration: number;
}

async function extractAudioMetadata(filePath: string, originalName: string): Promise<MediaMetadata> {
  try {
    const metadata = await parseFile(filePath);
    
    return {
      name: metadata.common.title || originalName.replace(/\.[^/.]+$/, ""),
      artist: metadata.common.artist || undefined,
      album: metadata.common.album || undefined,
      genre: metadata.common.genre?.[0] || undefined,
      year: metadata.common.year || undefined,
      duration: Math.floor(metadata.format.duration || 0)
    };
  } catch (error) {
    console.error('Audio metadata extraction failed:', error);
    return {
      name: originalName.replace(/\.[^/.]+$/, ""),
      duration: 0
    };
  }
}

async function extractVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : Math.floor(duration);
  } catch (error) {
    console.error('Video duration extraction failed:', error);
    return 0;
  }
}

function getFileType(filename: string, mimeType: string): 'audio' | 'video' | null {
  const extension = '.' + filename.split('.').pop()?.toLowerCase();
  
  if (AUDIO_EXTENSIONS.includes(extension) || AUDIO_MIME_TYPES.includes(mimeType)) {
    return 'audio';
  }
  
  if (VIDEO_EXTENSIONS.includes(extension) || VIDEO_MIME_TYPES.includes(mimeType)) {
    return 'video';
  }
  
  return null;
}

function validateFileSize(size: number, type: 'audio' | 'video'): boolean {
  const maxSize = type === 'audio' ? MAX_AUDIO_SIZE : MAX_VIDEO_SIZE;
  return size <= maxSize;
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ 
        error: 'File is required',
        code: 'FILE_REQUIRED' 
      }, { status: 400 });
    }

    // Validate file type
    const fileType = getFileType(file.name, file.type);
    if (!fileType) {
      return NextResponse.json({ 
        error: 'Unsupported file format. Supported formats: ' + 
               [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS].join(', '),
        code: 'UNSUPPORTED_FORMAT' 
      }, { status: 400 });
    }

    // Validate file size
    if (!validateFileSize(file.size, fileType)) {
      const maxSizeMB = fileType === 'audio' ? 100 : 1024;
      return NextResponse.json({ 
        error: `File too large. Maximum size for ${fileType} files is ${maxSizeMB}MB`,
        code: 'FILE_TOO_LARGE' 
      }, { status: 413 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const userDir = join(process.cwd(), 'uploads', fileType, user.id);
    const filePath = join(userDir, fileName);
    const relativePath = join('uploads', fileType, user.id, fileName);

    // Ensure directory exists
    await ensureDirectoryExists(userDir);

    // Save file to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Extract metadata based on file type
    let metadata: MediaMetadata;
    
    if (fileType === 'audio') {
      metadata = await extractAudioMetadata(filePath, file.name);
    } else {
      const duration = await extractVideoDuration(filePath);
      metadata = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        duration
      };
    }

    // Get folder from form data if provided
    const folder = formData.get('folder') as string || null;

    // Create database record
    const newMedia = await db.insert(media).values({
      name: metadata.name,
      type: fileType,
      filePath: relativePath,
      duration: metadata.duration,
      artist: metadata.artist || null,
      album: metadata.album || null,
      genre: metadata.genre || null,
      year: metadata.year || null,
      folder: folder,
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    if (newMedia.length === 0) {
      // Clean up file if database insert failed
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup file after database error:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: 'Failed to create media record',
        code: 'DATABASE_ERROR' 
      }, { status: 500 });
    }

    return NextResponse.json(newMedia[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}