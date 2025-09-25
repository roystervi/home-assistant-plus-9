import { db } from '@/db';
import { globalSettings } from '@/db/schema';

async function main() {
    const sampleGlobalSettings = [
        {
            id: 1,
            settings: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(globalSettings).values(sampleGlobalSettings);
    
    console.log('✅ Global settings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});