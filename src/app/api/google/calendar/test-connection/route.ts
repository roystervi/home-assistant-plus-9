import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { googleCalendars } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication using better-auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const user = session.user;
    const body = await request.json();
    const maxResults = Math.min(parseInt(body.maxResults) || 5, 10); // Limit to 10 max for test

    // Fetch user's stored Google Calendar tokens
    const tokenRecord = await db.select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, user.id))
      .limit(1);

    if (tokenRecord.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar not connected. Please connect first.',
        code: 'NOT_CONNECTED'
      }, { status: 400 });
    }

    const tokens = tokenRecord[0];
    const now = new Date();

    // Check if token is expired and refresh if needed
    if (tokens.expiresAt && tokens.expiresAt <= now) {
      if (!tokens.refreshToken) {
        return NextResponse.json({
          success: false,
          error: 'Google Calendar tokens expired and no refresh token available. Please reconnect.',
          code: 'TOKENS_EXPIRED_NO_REFRESH'
        }, { status: 400 });
      }

      // Refresh tokens
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return NextResponse.json({
          success: false,
          error: 'Google OAuth configuration not found'
        }, { status: 500 });
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken
      });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        if (!credentials.access_token || !credentials.expiry_date) {
          throw new Error('Invalid refresh response');
        }
        
        // Update stored tokens
        await db.update(googleCalendars)
          .set({
            accessToken: credentials.access_token,
            expiresAt: new Date(credentials.expiry_date),
            lastRefreshed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(googleCalendars.userId, user.id));

        // Update local tokens
        tokens.accessToken = credentials.access_token;
        tokens.expiresAt = new Date(credentials.expiry_date);

      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return NextResponse.json({
          success: false,
          error: 'Failed to refresh Google Calendar tokens. Please reconnect.',
          code: 'REFRESH_FAILED'
        }, { status: 400 });
      }
    }

    // Initialize Calendar API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch next maxResults events (upcoming)
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];

    // Simple transform for preview (no date mapping needed, just basic info)
    const previewEvents = events.map(event => ({
      id: event.id || '',
      summary: event.summary || 'Untitled Event',
      description: event.description || undefined,
      start: event.start,
      location: event.location || undefined
    }));

    // Update last synced
    await db.update(googleCalendars)
      .set({
        lastSynced: new Date(),
        updatedAt: new Date()
      })
      .where(eq(googleCalendars.userId, user.id));

    return NextResponse.json({
      success: true,
      events: previewEvents,
      message: `Successfully fetched ${previewEvents.length} upcoming events`,
      count: previewEvents.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Test connection error:', error);
    
    if (error.code === 401) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar access unauthorized. Please reconnect.',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Test connection failed',
      code: 'TEST_FAILED'
    }, { status: 500 });
  }
}