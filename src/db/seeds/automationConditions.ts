import { db } from '@/db';
import { automationConditions } from '@/db/schema';

async function main() {
    const sampleAutomationConditions = [
        // AUTOMATION 1 - "Living Room Evening Lights" conditions
        {
            automationId: 1,
            type: 'entity_state',
            entityId: 'sun.sun',
            attribute: 'elevation',
            operator: 'less',
            value: '0',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-15T09:30:00Z').toISOString(),
            updatedAt: new Date('2024-01-15T09:30:00Z').toISOString(),
        },
        {
            automationId: 1,
            type: 'entity_state',
            entityId: 'light.living_room',
            attribute: null,
            operator: 'equals',
            value: 'off',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-15T09:32:00Z').toISOString(),
            updatedAt: new Date('2024-02-10T14:22:00Z').toISOString(),
        },
        
        // AUTOMATION 2 - "Motion Security Alert" conditions
        {
            automationId: 2,
            type: 'time',
            entityId: null,
            attribute: null,
            operator: 'greater_equal',
            value: '22:00',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-18T11:15:00Z').toISOString(),
            updatedAt: new Date('2024-01-25T16:45:00Z').toISOString(),
        },
        {
            automationId: 2,
            type: 'time',
            entityId: null,
            attribute: null,
            operator: 'less_equal',
            value: '06:00',
            logicalOperator: 'or',
            createdAt: new Date('2024-01-18T11:16:00Z').toISOString(),
            updatedAt: new Date('2024-01-25T16:45:00Z').toISOString(),
        },
        {
            automationId: 2,
            type: 'entity_state',
            entityId: 'alarm_control_panel.home',
            attribute: null,
            operator: 'equals',
            value: 'armed_away',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-18T11:18:00Z').toISOString(),
            updatedAt: new Date('2024-02-08T10:12:00Z').toISOString(),
        },
        
        // AUTOMATION 3 - "Morning Routine" conditions
        {
            automationId: 3,
            type: 'entity_state',
            entityId: 'binary_sensor.workday',
            attribute: null,
            operator: 'equals',
            value: 'on',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-22T08:45:00Z').toISOString(),
            updatedAt: new Date('2024-01-22T08:45:00Z').toISOString(),
        },
        {
            automationId: 3,
            type: 'numeric',
            entityId: 'sensor.bedroom_temperature',
            attribute: null,
            operator: 'greater',
            value: '16',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-22T08:47:00Z').toISOString(),
            updatedAt: new Date('2024-02-15T12:30:00Z').toISOString(),
        },
        {
            automationId: 3,
            type: 'entity_state',
            entityId: 'device_tracker.phone_john',
            attribute: null,
            operator: 'equals',
            value: 'home',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-22T08:50:00Z').toISOString(),
            updatedAt: new Date('2024-01-28T19:15:00Z').toISOString(),
        },
        
        // AUTOMATION 4 - "Away Mode" conditions
        {
            automationId: 4,
            type: 'entity_state',
            entityId: 'group.all_lights',
            attribute: null,
            operator: 'not_equals',
            value: 'on',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-25T13:20:00Z').toISOString(),
            updatedAt: new Date('2024-02-12T09:18:00Z').toISOString(),
        },
        {
            automationId: 4,
            type: 'numeric',
            entityId: 'sensor.random_number',
            attribute: null,
            operator: 'greater',
            value: '0.7',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-25T13:22:00Z').toISOString(),
            updatedAt: new Date('2024-01-25T13:22:00Z').toISOString(),
        },
        {
            automationId: 4,
            type: 'entity_state',
            entityId: 'binary_sensor.vacation_mode',
            attribute: null,
            operator: 'equals',
            value: 'off',
            logicalOperator: 'and',
            createdAt: new Date('2024-01-25T13:25:00Z').toISOString(),
            updatedAt: new Date('2024-02-20T11:05:00Z').toISOString(),
        },
    ];

    await db.insert(automationConditions).values(sampleAutomationConditions);
    
    console.log('✅ Automation conditions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});