import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { media } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Simple debug query - no filtering, just raw results
    const results = await db.select()
      .from(media)
      .limit(20);

    // Return raw results with additional debug info
    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
      debug: {
        query: 'SELECT * FROM media LIMIT 20',
        timestamp: new Date().toISOString(),
        tableAccess: 'successful'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Media debug endpoint error:', error);
    
    // Return detailed error information for debugging
    return NextResponse.json({
      success: false,
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        query: 'SELECT * FROM media LIMIT 20',
        timestamp: new Date().toISOString(),
        tableAccess: 'failed'
      }
    }, { status: 500 });
  }
}