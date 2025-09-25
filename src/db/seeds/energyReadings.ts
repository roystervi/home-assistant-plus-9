import { db } from '@/db';
import { energyReadings } from '@/db/schema';

async function main() {
    const sampleEnergyReadings = [
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-04-15').toISOString(),
            kwhValue: 25950,
            dailyKwh: 31.67,
            weeklyKwh: 221.69,
            monthlyKwh: 950,
            readingType: 'main',
            createdAt: new Date('2025-04-15T14:30:00').toISOString(),
        },
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-05-15').toISOString(),
            kwhValue: 26770,
            dailyKwh: 27.33,
            weeklyKwh: 191.31,
            monthlyKwh: 820,
            readingType: 'main',
            createdAt: new Date('2025-05-15T14:30:00').toISOString(),
        },
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-06-15').toISOString(),
            kwhValue: 27870,
            dailyKwh: 36.67,
            weeklyKwh: 256.69,
            monthlyKwh: 1100,
            readingType: 'main',
            createdAt: new Date('2025-06-15T14:30:00').toISOString(),
        },
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-07-15').toISOString(),
            kwhValue: 29050,
            dailyKwh: 39.33,
            weeklyKwh: 275.31,
            monthlyKwh: 1180,
            readingType: 'main',
            createdAt: new Date('2025-07-15T14:30:00').toISOString(),
        },
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-08-15').toISOString(),
            kwhValue: 30200,
            dailyKwh: 38.33,
            weeklyKwh: 268.31,
            monthlyKwh: 1150,
            readingType: 'main',
            createdAt: new Date('2025-08-15T14:30:00').toISOString(),
        },
        {
            entityId: 'sensor.bobby_s_energy_this_month',
            friendlyName: "Bobby's Energy This Month",
            readingDate: new Date('2025-09-15').toISOString(),
            kwhValue: 31080,
            dailyKwh: 29.33,
            weeklyKwh: 205.31,
            monthlyKwh: 880,
            readingType: 'main',
            createdAt: new Date('2025-09-15T14:30:00').toISOString(),
        }
    ];

    await db.insert(energyReadings).values(sampleEnergyReadings);
    
    console.log('✅ Energy readings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});