import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch user settings
    const existingSettings = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    // Return existing settings or default settings
    if (existingSettings.length > 0) {
      return NextResponse.json({ settings: existingSettings[0].settings });
    } else {
      // Return default settings if none exist
      const defaultSettings = { "ha_url": "", "theme": "light" };
      return NextResponse.json({ settings: defaultSettings });
    }

  } catch (error) {
    console.error('GET user settings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate settings field
    if (!body.hasOwnProperty('settings')) {
      return NextResponse.json({ 
        error: "Settings field is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (typeof body.settings !== 'object' || body.settings === null || Array.isArray(body.settings)) {
      return NextResponse.json({ 
        error: "Settings must be a valid object",
        code: "INVALID_SETTINGS_FORMAT" 
      }, { status: 400 });
    }

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { settings } = body;
    const now = new Date().toISOString();

    // Check if user settings already exist
    const existingSettings = await db.select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (existingSettings.length > 0) {
      // Update existing settings
      const updated = await db.update(userSettings)
        .set({
          settings,
          updatedAt: now
        })
        .where(eq(userSettings.userId, session.user.id))
        .returning();

      return NextResponse.json({ settings: updated[0].settings });
    } else {
      // Insert new settings
      const newSettings = await db.insert(userSettings)
        .values({
          userId: session.user.id,
          settings,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      return NextResponse.json({ settings: newSettings[0].settings }, { status: 201 });
    }

  } catch (error) {
    console.error('POST user settings error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}