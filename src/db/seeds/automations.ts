import { db } from '@/db';
import { automations } from '@/db/schema';

async function main() {
    const sampleAutomations = [
        {
            name: 'Living Room Evening Lights',
            description: 'Automatically turns on living room lights at sunset with warm lighting',
            enabled: true,
            source: 'local',
            tags: JSON.stringify(['lights', 'evening', 'living_room']),
            createdAt: new Date('2024-12-07T18:30:00Z').toISOString(),
            updatedAt: new Date('2024-12-07T18:30:00Z').toISOString(),
            lastRun: new Date('2024-12-13T17:45:00Z').toISOString(),
        },
        {
            name: 'Motion Security Alert',
            description: 'Sends alert and turns on security lights when motion detected at night',
            enabled: true,
            source: 'ha',
            tags: JSON.stringify(['security', 'motion', 'night', 'alerts']),
            createdAt: new Date('2024-11-30T20:15:00Z').toISOString(),
            updatedAt: new Date('2024-11-30T20:15:00Z').toISOString(),
            lastRun: new Date('2024-12-11T02:23:00Z').toISOString(),
        },
        {
            name: 'Morning Routine',
            description: 'Gradually brightens bedroom lights and starts coffee maker at 6:30 AM on weekdays',
            enabled: true,
            source: 'local',
            tags: JSON.stringify(['morning', 'routine', 'lights', 'coffee']),
            createdAt: new Date('2024-11-14T09:00:00Z').toISOString(),
            updatedAt: new Date('2024-11-14T09:00:00Z').toISOString(),
            lastRun: new Date('2024-12-14T06:30:00Z').toISOString(),
        },
        {
            name: 'Away Mode',
            description: 'Randomly toggles lights throughout house when nobody is home to simulate presence',
            enabled: false,
            source: 'local',
            tags: JSON.stringify(['security', 'presence', 'away', 'lights']),
            createdAt: new Date('2024-11-23T14:20:00Z').toISOString(),
            updatedAt: new Date('2024-12-10T16:45:00Z').toISOString(),
            lastRun: new Date('2024-12-07T19:12:00Z').toISOString(),
        },
    ];

    await db.insert(automations).values(sampleAutomations);
    
    console.log('✅ Automations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});