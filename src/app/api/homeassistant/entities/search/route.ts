import { NextRequest, NextResponse } from 'next/server';
import { getHomeAssistantAPI } from '@/lib/homeassistant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const domain = searchParams.get('domain') || undefined;
    const limitParam = searchParams.get('limit') || '20';
    const deviceClass = searchParams.get('device_class') || undefined;
    const state = searchParams.get('state') || undefined;

    // Parse and validate limit
    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);

    // Get Home Assistant API instance
    const homeAssistant = getHomeAssistantAPI();
    
    if (!homeAssistant) {
      return NextResponse.json(
        { error: 'Home Assistant API not initialized' },
        { status: 503 }
      );
    }

    try {
      let entities;

      // Use the enhanced filtering method for comprehensive search
      const filterOptions: any = {
        limit,
      };

      if (q.trim()) {
        filterOptions.query = q.trim();
      }

      if (domain) {
        filterOptions.domains = [domain];
      }

      if (deviceClass) {
        filterOptions.deviceClasses = [deviceClass];
      }

      if (state) {
        filterOptions.states = [state];
      }

      // If no filters provided, return recent entities
      if (!q.trim() && !domain && !deviceClass && !state) {
        entities = await homeAssistant.getStates();
        entities = entities.slice(0, limit);
      } else {
        entities = await homeAssistant.filterEntities(filterOptions);
      }

      // Transform entities to include only necessary fields for frontend
      const transformedEntities = entities.map(entity => ({
        entity_id: entity.entity_id,
        friendly_name: entity.attributes?.friendly_name || entity.entity_id,
        state: entity.state,
        domain: entity.entity_id.split('.')[0],
        device_class: entity.attributes?.device_class || null,
        icon: entity.attributes?.icon || null,
        unit_of_measurement: entity.attributes?.unit_of_measurement || null,
        last_changed: entity.last_changed,
        last_updated: entity.last_updated,
      }));

      return NextResponse.json(transformedEntities, {
        headers: {
          'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
          'Content-Type': 'application/json',
        },
      });

    } catch (connectionError) {
      console.error('Home Assistant connection error:', connectionError);
      
      // Check if it's a connection/authentication error
      if (connectionError instanceof Error) {
        const message = connectionError.message;
        if (message.includes('401') || message.includes('authentication')) {
          return NextResponse.json(
            { error: 'Home Assistant authentication failed. Please check your access token.' },
            { status: 401 }
          );
        }
        if (message.includes('ECONNREFUSED') || message.includes('network')) {
          return NextResponse.json(
            { error: 'Cannot connect to Home Assistant. Please check your connection settings.' },
            { status: 503 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to fetch entities from Home Assistant', details: connectionError.message },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('API route error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}