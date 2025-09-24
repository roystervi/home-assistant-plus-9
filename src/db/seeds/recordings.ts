import { db } from '@/db';
import { recordings } from '@/db/schema';

async function main() {
    const sampleRecordings = [
        {
            cameraId: 1,
            filename: 'front_door_20241201_143022.mp4',
            timestamp: '2024-12-01T14:30:22.000Z',
            duration: 120,
            size: 45.2,
            trigger: 'motion',
            createdAt: '2024-12-01T14:30:25.000Z',
        },
        {
            cameraId: 2,
            filename: 'living_room_20241202_090015.mp4',
            timestamp: '2024-12-02T09:00:15.000Z',
            duration: 300,
            size: 78.5,
            trigger: 'schedule',
            createdAt: '2024-12-02T09:00:18.000Z',
        },
        {
            cameraId: 1,
            filename: 'front_door_20241203_183045.mp4',
            timestamp: '2024-12-03T18:30:45.000Z',
            duration: 180,
            size: 52.8,
            trigger: 'motion',
            createdAt: '2024-12-03T18:30:48.000Z',
        },
        {
            cameraId: 5,
            filename: 'driveway_20241204_122030.mp4',
            timestamp: '2024-12-04T12:20:30.000Z',
            duration: 60,
            size: 28.3,
            trigger: 'manual',
            createdAt: '2024-12-04T12:20:33.000Z',
        },
        {
            cameraId: 2,
            filename: 'living_room_20241205_200012.mp4',
            timestamp: '2024-12-05T20:00:12.000Z',
            duration: 240,
            size: 65.7,
            trigger: 'motion',
            createdAt: '2024-12-05T20:00:15.000Z',
        },
        {
            cameraId: 1,
            filename: 'front_door_20241206_071500.mp4',
            timestamp: '2024-12-06T07:15:00.000Z',
            duration: 90,
            size: 33.4,
            trigger: 'schedule',
            createdAt: '2024-12-06T07:15:03.000Z',
        }
    ];

    await db.insert(recordings).values(sampleRecordings);
    
    console.log('✅ Recordings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});