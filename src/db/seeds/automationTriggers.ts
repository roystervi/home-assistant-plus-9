import { db } from '@/db';
import { automationTriggers } from '@/db/schema';

async function main() {
    const sampleTriggers = [
        // AUTOMATION 1 - "Living Room Evening Lights" triggers
        {
            automationId: 1,
            type: 'sunrise_sunset',
            entityId: null,
            attribute: null,
            state: null,
            time: null,
            offset: -15,
            topic: null,
            payload: null,
            createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
            updatedAt: new Date('2024-02-10T14:20:00Z').toISOString(),
        },
        {
            automationId: 1,
            type: 'entity_state',
            entityId: 'binary_sensor.living_room_occupancy',
            attribute: null,
            state: 'on',
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-01-15T10:32:00Z').toISOString(),
            updatedAt: new Date('2024-01-15T10:32:00Z').toISOString(),
        },
        // AUTOMATION 2 - "Motion Security Alert" triggers
        {
            automationId: 2,
            type: 'entity_state',
            entityId: 'binary_sensor.front_door_motion',
            attribute: null,
            state: 'on',
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-01-20T15:45:00Z').toISOString(),
            updatedAt: new Date('2024-01-20T15:45:00Z').toISOString(),
        },
        {
            automationId: 2,
            type: 'entity_state',
            entityId: 'binary_sensor.backyard_motion',
            attribute: null,
            state: 'on',
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-01-20T15:47:00Z').toISOString(),
            updatedAt: new Date('2024-02-15T09:15:00Z').toISOString(),
        },
        {
            automationId: 2,
            type: 'zwave',
            entityId: 'binary_sensor.window_sensor_1',
            attribute: null,
            state: null,
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-01-20T15:50:00Z').toISOString(),
            updatedAt: new Date('2024-01-20T15:50:00Z').toISOString(),
        },
        // AUTOMATION 3 - "Morning Routine" triggers
        {
            automationId: 3,
            type: 'time',
            entityId: null,
            attribute: null,
            state: null,
            time: '06:30',
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-02-01T08:15:00Z').toISOString(),
            updatedAt: new Date('2024-02-20T07:30:00Z').toISOString(),
        },
        {
            automationId: 3,
            type: 'entity_state',
            entityId: 'binary_sensor.bedroom_motion',
            attribute: null,
            state: 'on',
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-02-01T08:18:00Z').toISOString(),
            updatedAt: new Date('2024-02-01T08:18:00Z').toISOString(),
        },
        // AUTOMATION 4 - "Away Mode" triggers
        {
            automationId: 4,
            type: 'entity_state',
            entityId: 'group.family',
            attribute: null,
            state: 'not_home',
            time: null,
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-02-05T12:00:00Z').toISOString(),
            updatedAt: new Date('2024-02-25T16:45:00Z').toISOString(),
        },
        {
            automationId: 4,
            type: 'time',
            entityId: null,
            attribute: null,
            state: null,
            time: '20:00',
            offset: null,
            topic: null,
            payload: null,
            createdAt: new Date('2024-02-05T12:05:00Z').toISOString(),
            updatedAt: new Date('2024-02-05T12:05:00Z').toISOString(),
        }
    ];

    await db.insert(automationTriggers).values(sampleTriggers);
    
    console.log('✅ Automation triggers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});