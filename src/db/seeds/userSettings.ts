import { db } from '@/db';
import { userSettings } from '@/db/schema';

async function main() {
    const sampleUserSettings = [
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            settings: {
                ha_url: 'http://192.168.1.100:8123',
                theme: 'dark',
                notifications: {
                    push_enabled: true,
                    email_enabled: true,
                    automation_alerts: true,
                    energy_alerts: true
                },
                dashboard_layout: 'grid',
                auto_refresh_interval: 30,
                energy_monitoring: {
                    show_charts: true,
                    default_period: 'monthly',
                    cost_per_kwh: 0.12
                },
                camera_settings: {
                    auto_play: false,
                    quality: 'high',
                    motion_detection: true
                }
            },
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            settings: {
                ha_url: '',
                theme: 'light',
                notifications: {
                    push_enabled: false,
                    email_enabled: true,
                    automation_alerts: false,
                    energy_alerts: true
                },
                dashboard_layout: 'list',
                auto_refresh_interval: 60,
                energy_monitoring: {
                    show_charts: false,
                    default_period: 'weekly',
                    cost_per_kwh: 0.15
                },
                camera_settings: {
                    auto_play: true,
                    quality: 'medium',
                    motion_detection: false
                }
            },
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-02-01').toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            settings: {
                ha_url: 'http://homeassistant.local:8123',
                theme: 'dark',
                notifications: {
                    push_enabled: true,
                    email_enabled: false,
                    automation_alerts: true,
                    energy_alerts: false
                },
                dashboard_layout: 'compact',
                auto_refresh_interval: 15,
                energy_monitoring: {
                    show_charts: true,
                    default_period: 'daily',
                    cost_per_kwh: 0.08
                },
                camera_settings: {
                    auto_play: true,
                    quality: 'high',
                    motion_detection: true
                }
            },
            createdAt: new Date('2024-02-05').toISOString(),
            updatedAt: new Date('2024-02-10').toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r7',
            settings: {
                ha_url: 'https://my-ha.duckdns.org:8123',
                theme: 'light',
                notifications: {
                    push_enabled: true,
                    email_enabled: true,
                    automation_alerts: true,
                    energy_alerts: true
                },
                dashboard_layout: 'grid',
                auto_refresh_interval: 45,
                energy_monitoring: {
                    show_charts: true,
                    default_period: 'monthly',
                    cost_per_kwh: 0.11
                },
                camera_settings: {
                    auto_play: false,
                    quality: 'low',
                    motion_detection: false
                }
            },
            createdAt: new Date('2024-02-12').toISOString(),
            updatedAt: new Date('2024-02-15').toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r8',
            settings: {
                ha_url: '',
                theme: 'dark',
                notifications: {
                    push_enabled: false,
                    email_enabled: false,
                    automation_alerts: false,
                    energy_alerts: false
                },
                dashboard_layout: 'list',
                auto_refresh_interval: 120,
                energy_monitoring: {
                    show_charts: false,
                    default_period: 'yearly',
                    cost_per_kwh: 0.13
                },
                camera_settings: {
                    auto_play: false,
                    quality: 'medium',
                    motion_detection: true
                }
            },
            createdAt: new Date('2024-02-18').toISOString(),
            updatedAt: new Date('2024-02-18').toISOString(),
        }
    ];

    await db.insert(userSettings).values(sampleUserSettings);
    
    console.log('✅ User settings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});