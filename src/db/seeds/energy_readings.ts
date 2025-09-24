import { db } from '@/db';
import { energyReadings } from '@/db/schema';

async function main() {
    const sampleReadings = [
        // Main Energy Meter - Daily readings October 2024
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-01', kwhValue: 15000.0, dailyKwh: 28.5, weeklyKwh: 28.5, monthlyKwh: 28.5, readingType: 'main', createdAt: '2024-10-01T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-02', kwhValue: 15032.2, dailyKwh: 32.2, weeklyKwh: 60.7, monthlyKwh: 60.7, readingType: 'main', createdAt: '2024-10-02T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-03', kwhValue: 15060.8, dailyKwh: 28.6, weeklyKwh: 89.3, monthlyKwh: 89.3, readingType: 'main', createdAt: '2024-10-03T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-04', kwhValue: 15091.4, dailyKwh: 30.6, weeklyKwh: 119.9, monthlyKwh: 119.9, readingType: 'main', createdAt: '2024-10-04T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-05', kwhValue: 15118.7, dailyKwh: 27.3, weeklyKwh: 147.2, monthlyKwh: 147.2, readingType: 'main', createdAt: '2024-10-05T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-15', kwhValue: 15420.3, dailyKwh: 29.8, weeklyKwh: 210.4, monthlyKwh: 420.3, readingType: 'main', createdAt: '2024-10-15T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-10-31', kwhValue: 15900.5, dailyKwh: 31.2, weeklyKwh: 218.6, monthlyKwh: 900.5, readingType: 'main', createdAt: '2024-10-31T06:00:00.000Z' },

        // Main Energy Meter - November 2024 (higher usage)
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-11-01', kwhValue: 15938.7, dailyKwh: 38.2, weeklyKwh: 231.4, monthlyKwh: 38.2, readingType: 'main', createdAt: '2024-11-01T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-11-02', kwhValue: 15980.1, dailyKwh: 41.4, weeklyKwh: 265.8, monthlyKwh: 79.6, readingType: 'main', createdAt: '2024-11-02T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-11-15', kwhValue: 16520.8, dailyKwh: 42.3, weeklyKwh: 298.7, monthlyKwh: 582.1, readingType: 'main', createdAt: '2024-11-15T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-11-30', kwhValue: 17180.4, dailyKwh: 39.8, weeklyKwh: 285.2, monthlyKwh: 1241.7, readingType: 'main', createdAt: '2024-11-30T06:00:00.000Z' },

        // Main Energy Meter - December 2024 (peak winter usage)
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-12-01', kwhValue: 17225.6, dailyKwh: 45.2, weeklyKwh: 315.4, monthlyKwh: 45.2, readingType: 'main', createdAt: '2024-12-01T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-12-02', kwhValue: 17272.8, dailyKwh: 47.2, weeklyKwh: 342.6, monthlyKwh: 92.4, readingType: 'main', createdAt: '2024-12-02T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-12-15', kwhValue: 17890.5, dailyKwh: 48.1, weeklyKwh: 334.8, monthlyKwh: 709.7, readingType: 'main', createdAt: '2024-12-15T06:00:00.000Z' },
        { entityId: 'sensor.energy_main', friendlyName: 'Main Energy Meter', readingDate: '2024-12-31', kwhValue: 18650.2, dailyKwh: 44.8, weeklyKwh: 318.5, monthlyKwh: 1469.8, readingType: 'main', createdAt: '2024-12-31T06:00:00.000Z' },

        // HVAC Energy Monitor - Every 2-3 days
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-10-01', kwhValue: 8500.0, dailyKwh: 12.4, weeklyKwh: 12.4, monthlyKwh: 12.4, readingType: 'device', createdAt: '2024-10-01T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-10-03', kwhValue: 8525.8, dailyKwh: 12.9, weeklyKwh: 25.3, monthlyKwh: 25.8, readingType: 'device', createdAt: '2024-10-03T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-10-06', kwhValue: 8565.2, dailyKwh: 13.1, weeklyKwh: 38.4, monthlyKwh: 65.2, readingType: 'device', createdAt: '2024-10-06T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-10-31', kwhValue: 8920.4, dailyKwh: 14.2, weeklyKwh: 98.6, monthlyKwh: 420.4, readingType: 'device', createdAt: '2024-10-31T06:00:00.000Z' },

        // HVAC November - Higher usage
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-11-02', kwhValue: 8950.8, dailyKwh: 15.2, weeklyKwh: 106.8, monthlyKwh: 30.4, readingType: 'device', createdAt: '2024-11-02T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-11-05', kwhValue: 8998.6, dailyKwh: 15.9, weeklyKwh: 122.7, monthlyKwh: 78.2, readingType: 'device', createdAt: '2024-11-05T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-11-30', kwhValue: 9420.8, dailyKwh: 16.8, weeklyKwh: 117.6, monthlyKwh: 500.4, readingType: 'device', createdAt: '2024-11-30T06:00:00.000Z' },

        // HVAC December - Peak usage
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-12-02', kwhValue: 9455.2, dailyKwh: 17.2, weeklyKwh: 120.4, monthlyKwh: 34.4, readingType: 'device', createdAt: '2024-12-02T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-12-05', kwhValue: 9507.8, dailyKwh: 17.5, weeklyKwh: 137.9, monthlyKwh: 87.0, readingType: 'device', createdAt: '2024-12-05T06:00:00.000Z' },
        { entityId: 'sensor.hvac_energy', friendlyName: 'HVAC Energy Monitor', readingDate: '2024-12-31', kwhValue: 9980.4, dailyKwh: 18.2, weeklyKwh: 127.4, monthlyKwh: 559.6, readingType: 'device', createdAt: '2024-12-31T06:00:00.000Z' },

        // Water Heater Energy - Every 2-3 days
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-10-01', kwhValue: 3200.0, dailyKwh: 4.2, weeklyKwh: 4.2, monthlyKwh: 4.2, readingType: 'device', createdAt: '2024-10-01T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-10-04', kwhValue: 3212.8, dailyKwh: 4.3, weeklyKwh: 8.5, monthlyKwh: 12.8, readingType: 'device', createdAt: '2024-10-04T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-10-07', kwhValue: 3225.4, dailyKwh: 4.2, weeklyKwh: 12.7, monthlyKwh: 25.4, readingType: 'device', createdAt: '2024-10-07T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-10-31', kwhValue: 3330.6, dailyKwh: 4.4, weeklyKwh: 30.8, monthlyKwh: 130.6, readingType: 'device', createdAt: '2024-10-31T06:00:00.000Z' },

        // Water Heater November
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-11-03', kwhValue: 3344.2, dailyKwh: 4.5, weeklyKwh: 31.5, monthlyKwh: 13.6, readingType: 'device', createdAt: '2024-11-03T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-11-06', kwhValue: 3358.1, dailyKwh: 4.6, weeklyKwh: 32.1, monthlyKwh: 27.5, readingType: 'device', createdAt: '2024-11-06T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-11-30', kwhValue: 3470.8, dailyKwh: 4.7, weeklyKwh: 32.9, monthlyKwh: 140.2, readingType: 'device', createdAt: '2024-11-30T06:00:00.000Z' },

        // Water Heater December
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-12-03', kwhValue: 3485.2, dailyKwh: 4.8, weeklyKwh: 33.6, monthlyKwh: 14.4, readingType: 'device', createdAt: '2024-12-03T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-12-06', kwhValue: 3499.8, dailyKwh: 4.9, weeklyKwh: 34.5, monthlyKwh: 29.0, readingType: 'device', createdAt: '2024-12-06T06:00:00.000Z' },
        { entityId: 'sensor.water_heater_energy', friendlyName: 'Water Heater Energy', readingDate: '2024-12-31', kwhValue: 3620.4, dailyKwh: 4.8, weeklyKwh: 33.6, monthlyKwh: 149.6, readingType: 'device', createdAt: '2024-12-31T06:00:00.000Z' }
    ];

    await db.insert(energyReadings).values(sampleReadings);
    
    console.log('✅ Energy readings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});