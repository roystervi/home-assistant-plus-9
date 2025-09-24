import { db } from '@/db';
import { cameras } from '@/db/schema';

async function main() {
    const sampleCameras = [
        {
            name: 'Front Door',
            connectionType: 'rtsp',
            url: 'rtsp://192.168.1.100/stream1',
            username: null,
            password: null,
            status: 'online',
            format: 'H.264',
            resolution: '1920x1080',
            haEntity: 'camera.front_door',
            createdAt: new Date('2024-12-05').toISOString(),
            updatedAt: new Date('2024-12-05').toISOString(),
        },
        {
            name: 'Living Room',
            connectionType: 'onvif',
            url: 'http://192.168.1.101/onvif',
            username: null,
            password: null,
            status: 'online',
            format: 'H.265',
            resolution: '1280x720',
            haEntity: 'camera.living_room',
            createdAt: new Date('2024-12-06').toISOString(),
            updatedAt: new Date('2024-12-06').toISOString(),
        },
        {
            name: 'Backyard',
            connectionType: 'http',
            url: 'http://192.168.1.102/stream',
            username: null,
            password: null,
            status: 'offline',
            format: 'MJPEG',
            resolution: '1280x720',
            haEntity: 'camera.backyard',
            createdAt: new Date('2024-12-07').toISOString(),
            updatedAt: new Date('2024-12-07').toISOString(),
        },
        {
            name: 'Kitchen',
            connectionType: 'rtmp',
            url: 'rtmp://192.168.1.103/live',
            username: null,
            password: null,
            status: 'connecting',
            format: 'H.264',
            resolution: '1920x1080',
            haEntity: 'camera.kitchen',
            createdAt: new Date('2024-12-08').toISOString(),
            updatedAt: new Date('2024-12-08').toISOString(),
        },
        {
            name: 'Driveway',
            connectionType: 'rtsp',
            url: 'rtsp://admin:password@192.168.1.104/stream2',
            username: 'admin',
            password: 'password',
            status: 'online',
            format: 'H.265',
            resolution: '2560x1440',
            haEntity: 'camera.driveway',
            createdAt: new Date('2024-12-09').toISOString(),
            updatedAt: new Date('2024-12-09').toISOString(),
        }
    ];

    await db.insert(cameras).values(sampleCameras);
    
    console.log('✅ Cameras seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});