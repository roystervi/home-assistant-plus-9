import { db } from '@/db';
import { automations, automationTriggers, automationConditions, automationActions } from '@/db/schema';

async function main() {
  const now = new Date().toISOString();

  // Sample 1: Evening Lights
  const aut1Id = await db.insert(automations).values({
    name: 'Evening Lights',
    description: 'Turn on lights at sunset after 6 PM',
    enabled: true,
    source: 'local',
    tags: JSON.stringify(['lighting', 'evening']),
    createdAt: now,
    updatedAt: now
  }).returning({ id: automations.id });

  await db.insert(automationTriggers).values({
    automationId: aut1Id[0].id,
    type: 'sunrise_sunset',
    createdAt: now,
    updatedAt: now
  });

  await db.insert(automationConditions).values({
    automationId: aut1Id[0].id,
    type: 'time',
    operator: 'after',
    value: '18:00',
    createdAt: now,
    updatedAt: now
  });

  await db.insert(automationActions).values({
    automationId: aut1Id[0].id,
    type: 'service_call',
    service: 'light.turn_on',
    entityId: 'light.living_room',
    createdAt: now,
    updatedAt: now
  });

  // Sample 2: Motion Alert
  const aut2Id = await db.insert(automations).values({
    name: 'Motion Alert',
    description: 'Notify on motion detection',
    enabled: true,
    source: 'ha',
    tags: JSON.stringify(['security', 'motion']),
    createdAt: now,
    updatedAt: now
  }).returning({ id: automations.id });

  await db.insert(automationTriggers).values({
    automationId: aut2Id[0].id,
    type: 'entity_state',
    entityId: 'binary_sensor.hallway_motion',
    state: 'on',
    createdAt: now,
    updatedAt: now
  });

  await db.insert(automationActions).values({
    automationId: aut2Id[0].id,
    type: 'service_call',
    service: 'notify.mobile_app',
    data: JSON.stringify({ message: 'Motion detected' }),
    createdAt: now,
    updatedAt: now
  });

  // Sample 3: Morning Coffee
  const aut3Id = await db.insert(automations).values({
    name: 'Morning Coffee',
    description: 'Start coffee maker at 7 AM',
    enabled: false,
    source: 'local',
    tags: JSON.stringify(['morning', 'kitchen']),
    createdAt: now,
    updatedAt: now
  }).returning({ id: automations.id });

  await db.insert(automationTriggers).values({
    automationId: aut3Id[0].id,
    type: 'time',
    time: '07:00',
    createdAt: now,
    updatedAt: now
  });

  await db.insert(automationActions).values({
    automationId: aut3Id[0].id,
    type: 'service_call',
    service: 'switch.turn_on',
    entityId: 'switch.coffee_maker',
    createdAt: now,
    updatedAt: now
  });

  console.log('✅ Automations seeded with separate tables');
}

main().catch(console.error);