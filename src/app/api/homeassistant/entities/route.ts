import { NextRequest, NextResponse } from 'next/server';

import { createHomeAssistantAPI } from '@/lib/homeassistant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, token, entities } = body;

    if (!url || !token) {
      return NextResponse.json({ error: 'URL and token required' }, { status: 400 });
    }

    // Create HA API instance without WebSocket connection - use REST only
    const ha = createHomeAssistantAPI({ url, token });
    
    // If no entities specified or invalid, fetch all states or a default set
    let targetEntities = entities || [];
    if (!targetEntities.length || targetEntities.every(e => !e || e.includes('entity_id') || e.includes('process'))) {
      // Default status entities - adjust based on common HA entities
      targetEntities = [
        'update.home_assistant_core_update',
        'sensor.last_boot',
        'sensor.uptime',
        'binary_sensor.home_assistant_started'
      ];
    }

    const states = await ha.getStates(targetEntities);
    const entityStates = states.reduce((acc, entity) => {
      acc[entity.entity_id] = entity.state || 'unknown'; // Simplify to state only since UI expects string
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ entities: entityStates });
  } catch (error) {
    console.error('Error fetching HA entities:', error);
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
  }
}