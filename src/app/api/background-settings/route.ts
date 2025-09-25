import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userBackgroundSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Mock authentication for testing - in production replace with real auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Extract user ID from token (mock implementation)
    const token = authHeader.replace('Bearer ', '');
    const mockUserId = token; // For testing, use token as user ID

    const setting = await db.select({
      backgroundMode: userBackgroundSettings.backgroundMode,
      customBgColor: userBackgroundSettings.customBgColor,
      backgroundImage: userBackgroundSettings.backgroundImage,
    })
    .from(userBackgroundSettings)
    .where(eq(userBackgroundSettings.userId, mockUserId))
    .limit(1);

    if (setting.length === 0) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(setting[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Mock authentication for testing - in production replace with real auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Extract user ID from token (mock implementation)
    const token = authHeader.replace('Bearer ', '');
    const mockUserId = token; // For testing, use token as user ID

    const requestBody = await request.json();
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { backgroundMode, customBgColor, backgroundImage } = requestBody;

    // Validate required fields
    if (!backgroundMode) {
      return NextResponse.json({ 
        error: "backgroundMode is required",
        code: "MISSING_BACKGROUND_MODE" 
      }, { status: 400 });
    }

    // Validate customBgColor format if provided
    if (customBgColor && !/^#[0-9A-Fa-f]{6}$/.test(customBgColor)) {
      return NextResponse.json({ 
        error: "customBgColor must be a valid hex color format (#RRGGBB)",
        code: "INVALID_HEX_COLOR" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check if user setting already exists
    const existingSetting = await db.select()
      .from(userBackgroundSettings)
      .where(eq(userBackgroundSettings.userId, mockUserId))
      .limit(1);

    let result;

    if (existingSetting.length > 0) {
      // Update existing setting
      const updated = await db.update(userBackgroundSettings)
        .set({
          backgroundMode,
          customBgColor: customBgColor || null,
          backgroundImage: backgroundImage || null,
          updatedAt: now
        })
        .where(eq(userBackgroundSettings.userId, mockUserId))
        .returning({
          backgroundMode: userBackgroundSettings.backgroundMode,
          customBgColor: userBackgroundSettings.customBgColor,
          backgroundImage: userBackgroundSettings.backgroundImage,
        });

      result = updated[0];
    } else {
      // Create new setting
      const created = await db.insert(userBackgroundSettings)
        .values({
          userId: mockUserId,
          backgroundMode,
          customBgColor: customBgColor || null,
          backgroundImage: backgroundImage || null,
          updatedAt: now
        })
        .returning({
          backgroundMode: userBackgroundSettings.backgroundMode,
          customBgColor: userBackgroundSettings.customBgColor,
          backgroundImage: userBackgroundSettings.backgroundImage,
        });

      result = created[0];
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}