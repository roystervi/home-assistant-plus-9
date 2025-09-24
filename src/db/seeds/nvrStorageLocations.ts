import { db } from '@/db';
import { nvrStorageLocations } from '@/db/schema';

async function main() {
    const sampleStorageLocations = [
        {
            name: 'Local HDD',
            path: '/mnt/nvr/local',
            type: 'local',
            capacityGb: 2000,
            usedGb: 156,
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'NAS Storage',
            path: '//192.168.1.50/nvr',
            type: 'network',
            capacityGb: 4000,
            usedGb: 0,
            enabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(nvrStorageLocations).values(sampleStorageLocations);
    
    console.log('✅ NVR storage locations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});