"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Sprout, 
  Power, 
  Sun, 
  Cloud, 
  CloudRain, 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Settings,
  Clock,
  Thermometer,
  RefreshCw,
  PowerOff,
  Droplets,
  RotateCcw
} from "lucide-react";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";

interface ZoneState {
  id: number;
  name: string;
  running: boolean;
  timer: number;
  entityId: string;
}

interface WeatherData {
  condition: string;
  temperature: number;
  icon: React.ReactNode;
}

interface SprinklerEntity {
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
  last_changed?: string;
}

export default function SprinklerControl() {
  const { entities, isConnected, callService } = useHomeAssistant();
  
  // Process entities from Home Assistant
  const [processedEntities, setProcessedEntities] = useState<Record<string, SprinklerEntity>>({});
  const [weeklySchedule, setWeeklySchedule] = useState({
    'switch.sprinkler_sun': false,
    'switch.sprinkler_mon': true,
    'switch.sprinkler_tue': false,
    'switch.sprinkler_wed': true,
    'switch.sprinkler_thur': false,
    'switch.sprinkler_fri': true,
    'switch.sprinkler_sat': false,
  });

  // Process Home Assistant entities
  useEffect(() => {
    if (!entities || Object.keys(entities).length === 0) {
      // Set default/fallback entities if HA not connected
      setProcessedEntities({
        'sensor.pump_power_minute_average': { entity_id: 'sensor.pump_power_minute_average', state: '0.0' },
        'switch.sprinkler_zone_1': { entity_id: 'switch.sprinkler_zone_1', state: 'off' },
        'switch.sprinkler_zone_2': { entity_id: 'switch.sprinkler_zone_2', state: 'off' },
        'switch.sprinkler_zone_3': { entity_id: 'switch.sprinkler_zone_3', state: 'off' },
        'switch.sprinkler_zone_4': { entity_id: 'switch.sprinkler_zone_4', state: 'off' },
        'switch.sprinkler_zone_5': { entity_id: 'switch.sprinkler_zone_5', state: 'off' },
        'switch.sprinkler_power': { entity_id: 'switch.sprinkler_power', state: 'on' },
        'switch.sprinkler_rain_delay': { entity_id: 'switch.sprinkler_rain_delay', state: 'on' },
        'switch.sprinkler_auto_advance': { entity_id: 'switch.sprinkler_auto_advance', state: 'on' },
        'sensor.sprinkler_esp_time': { entity_id: 'sensor.sprinkler_esp_time', state: '14:32' },
        'sensor.sprinkler_esp_date': { entity_id: 'sensor.sprinkler_esp_date', state: 'Dec 3' },
        'sensor.sprinkler_uptime': { entity_id: 'sensor.sprinkler_uptime', state: '72 hours' },
        'sensor.garagedoor_driveway_temp': { entity_id: 'sensor.garagedoor_driveway_temp', state: '78' },
        'sensor.jax_temp': { entity_id: 'sensor.jax_temp', state: '72' },
        'weather.home': { entity_id: 'weather.home', state: 'sunny' },
        'sensor.sprinkler_zones_status': { entity_id: 'sensor.sprinkler_zones_status', state: '0/5 running' },
        'sensor.sprinkler_total_time': { entity_id: 'sensor.sprinkler_total_time', state: '65 min' },
        'sensor.sprinkler_zone_time_remaining': { entity_id: 'sensor.sprinkler_zone_time_remaining', state: '0 min' },
        'select.sprinkler_schedule': { entity_id: 'select.sprinkler_schedule', state: 'daily' },
        'select.sprinkler_rain_delay': { entity_id: 'select.sprinkler_rain_delay', state: '0 hours' },
        'number.sprinkler_repeat': { entity_id: 'number.sprinkler_repeat', state: '1' },
        'number.sprinkler_set_1_timer': { entity_id: 'number.sprinkler_set_1_timer', state: '10' },
        'number.sprinkler_set_2_timer': { entity_id: 'number.sprinkler_set_2_timer', state: '15' },
        'number.sprinkler_set_3_timer': { entity_id: 'number.sprinkler_set_3_timer', state: '8' },
        'number.sprinkler_set_4_timer': { entity_id: 'number.sprinkler_set_4_timer', state: '12' },
        'number.sprinkler_set_5_timer': { entity_id: 'number.sprinkler_set_5_timer', state: '20' },
      });
      return;
    }

    // Process real HA entities
    const processed: Record<string, SprinklerEntity> = {};
    const sprinklerEntityIds = [
      'sensor.pump_power_minute_average',
      'switch.sprinkler_zone_1', 'switch.sprinkler_zone_2', 'switch.sprinkler_zone_3', 'switch.sprinkler_zone_4', 'switch.sprinkler_zone_5',
      'switch.sprinkler_power', 'switch.sprinkler_rain_delay', 'switch.sprinkler_auto_advance',
      'sensor.sprinkler_esp_time', 'sensor.sprinkler_esp_date', 'sensor.sprinkler_uptime',
      'sensor.garagedoor_driveway_temp', 'sensor.jax_temp', 'weather.home',
      'sensor.sprinkler_zones_status', 'sensor.sprinkler_total_time', 'sensor.sprinkler_zone_time_remaining',
      'select.sprinkler_schedule', 'select.sprinkler_rain_delay',
      'number.sprinkler_repeat', 'number.sprinkler_set_1_timer', 'number.sprinkler_set_2_timer',
      'number.sprinkler_set_3_timer', 'number.sprinkler_set_4_timer', 'number.sprinkler_set_5_timer'
    ];

    sprinklerEntityIds.forEach(entityId => {
      const entity = entities[entityId];
      if (entity) {
        processed[entityId] = {
          entity_id: entityId,
          state: entity.state || 'unknown',
          attributes: entity.attributes,
          last_changed: entity.last_changed
        };
      } else {
        // Fallback for missing entities
        processed[entityId] = {
          entity_id: entityId,
          state: entityId.includes('timer') ? '10' : entityId.includes('zone') ? 'off' : 'unknown'
        };
      }
    });

    setProcessedEntities(processed);
  }, [entities]);

  // Helper functions to check states
  const isZoneRunning = (zoneId: number) => processedEntities[`switch.sprinkler_zone_${zoneId}`]?.state === 'on';
  const isPumpRunning = () => parseFloat(processedEntities['sensor.pump_power_minute_average']?.state || '0') > 0.0;
  const isSystemPowered = () => processedEntities['switch.sprinkler_power']?.state === 'on';
  const isRainDelay = () => processedEntities['switch.sprinkler_rain_delay']?.state === 'off'; // Inverted logic as per HA config
  const isAutoAdvance = () => processedEntities['switch.sprinkler_auto_advance']?.state === 'on';
  const anyZoneRunning = [1, 2, 3, 4, 5].some(id => isZoneRunning(id));

  // Function to toggle Home Assistant entity
  const toggleEntity = async (entityId: string) => {
    if (!isConnected) {
      toast.error("Not connected to Home Assistant");
      return;
    }

    try {
      const currentState = processedEntities[entityId]?.state;
      const service = currentState === 'on' ? 'turn_off' : 'turn_on';
      const domain = entityId.split('.')[0];
      
      await callService(domain, service, entityId);
      
      // Optimistic update
      setProcessedEntities(prev => ({
        ...prev,
        [entityId]: { ...prev[entityId], state: currentState === 'on' ? 'off' : 'on' }
      }));
      
      toast.success(`${entityId.split('.').pop()} ${currentState === 'on' ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Error toggling entity:', error);
      toast.error('Failed to toggle entity');
    }
  };

  // Function to trigger button entity
  const triggerButton = async (entityId: string) => {
    if (!isConnected) {
      // Provide feedback even in demo mode
      toast.success(`${entityId.split('.').pop()} triggered (demo mode)`);
      return;
    }

    try {
      await callService('button', 'press', entityId);
      toast.success(`${entityId.split('.').pop()} triggered`);
    } catch (error) {
      console.error('Error triggering button:', error);
      toast.error('Failed to trigger button');
    }
  };

  const toggleScheduleDay = (dayEntityId: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [dayEntityId]: !prev[dayEntityId as keyof typeof prev]
    }));
    const dayName = dayEntityId.split('_').pop();
    toast.success(`${dayName} ${weeklySchedule[dayEntityId as keyof typeof weeklySchedule] ? 'disabled' : 'enabled'}`);
  };

  const updateNumberEntity = async (entityId: string, value: string) => {
    if (!isConnected) {
      // Optimistic update for offline mode
      setProcessedEntities(prev => ({
        ...prev,
        [entityId]: { ...prev[entityId], state: value }
      }));
      return;
    }

    try {
      await callService('number', 'set_value', entityId, { value: parseFloat(value) });
      
      setProcessedEntities(prev => ({
        ...prev,
        [entityId]: { ...prev[entityId], state: value }
      }));
    } catch (error) {
      console.error('Error updating number entity:', error);
      toast.error('Failed to update timer');
    }
  };

  const dayButtons = [
    { entityId: 'switch.sprinkler_sun', label: 'Sun' },
    { entityId: 'switch.sprinkler_mon', label: 'Mon' },
    { entityId: 'switch.sprinkler_tue', label: 'Tue' },
    { entityId: 'switch.sprinkler_wed', label: 'Wed' },
    { entityId: 'switch.sprinkler_thur', label: 'Thu' },
    { entityId: 'switch.sprinkler_fri', label: 'Fri' },
    { entityId: 'switch.sprinkler_sat', label: 'Sat' },
  ];

  const controlButtons = [
    { entityId: 'button.sprinkler_start', icon: Play, label: 'Start' },
    { entityId: 'button.sprinkler_stop', icon: Square, label: 'Stop' },
    { entityId: 'button.sprinkler_pause', icon: Pause, label: 'Pause' },
    { entityId: 'button.sprinkler_resume', icon: Play, label: 'Resume' },
    { entityId: 'button.sprinkler_next', icon: SkipForward, label: 'Next' },
    { entityId: 'button.sprinkler_previous', icon: SkipBack, label: 'Previous' },
  ];

  const zones = [
    { id: 1, name: 'Zone 1', entityId: 'switch.sprinkler_zone_1', timerEntity: 'number.sprinkler_set_1_timer' },
    { id: 2, name: 'Zone 2', entityId: 'switch.sprinkler_zone_2', timerEntity: 'number.sprinkler_set_2_timer' },
    { id: 3, name: 'Zone 3', entityId: 'switch.sprinkler_zone_3', timerEntity: 'number.sprinkler_set_3_timer' },
    { id: 4, name: 'Zone 4', entityId: 'switch.sprinkler_zone_4', timerEntity: 'number.sprinkler_set_4_timer' },
    { id: 5, name: 'Zone 5', entityId: 'switch.sprinkler_zone_5', timerEntity: 'number.sprinkler_set_5_timer' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Connection Status */}
      {!isConnected && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Not connected to Home Assistant - showing demo data
          </p>
        </div>
      )}

      {/* System Status Header - Mushroom Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {anyZoneRunning ? (
                  <Sprout className="h-8 w-8 text-emerald-500 animate-pulse" />
                ) : (
                  <Droplets className="h-8 w-8 text-gray-400" />
                )}
                {anyZoneRunning && (
                  <div className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Sprinkler Sys V2.0</h3>
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-sm ${anyZoneRunning ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {anyZoneRunning ? 'System Running' : 'System Idle'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {processedEntities['sensor.sprinkler_esp_time']?.state} | {processedEntities['sensor.sprinkler_esp_date']?.state}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Power className={`h-8 w-8 ${isPumpRunning() ? 'text-cyan-500' : 'text-gray-400'}`} />
                {isPumpRunning() && (
                  <>
                    <div className="absolute -inset-1 rounded-full bg-cyan-500/20 animate-ping" />
                    <div className="absolute inset-1 animate-spin">
                      <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {isPumpRunning() ? 'Pump Running' : 'Pump Idle'}
                </h3>
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-sm ${isPumpRunning() ? 'text-cyan-600' : 'text-gray-500'}`}>
                    Power: {processedEntities['sensor.pump_power_minute_average']?.state || '0.0'}W
                  </p>
                  <p className="text-xs text-gray-500">
                    {processedEntities['sensor.sprinkler_esp_time']?.state} | {processedEntities['sensor.sprinkler_esp_date']?.state}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {dayButtons.map(({ entityId, label }) => (
              <Button
                key={entityId}
                onClick={() => toggleScheduleDay(entityId)}
                className={`h-12 font-medium transform transition-all duration-150 active:scale-95 shadow-sm ${
                  weeklySchedule[entityId as keyof typeof weeklySchedule]
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-0'
                    : 'bg-red-500 hover:bg-red-600 text-white border-0'
                }`}
                style={{
                  transform: weeklySchedule[entityId as keyof typeof weeklySchedule] 
                    ? 'rotateX(0deg)' 
                    : 'rotateX(5deg)',
                  boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'rotateX(50deg)';
                  e.currentTarget.style.transformOrigin = 'center bottom';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = weeklySchedule[entityId as keyof typeof weeklySchedule] 
                    ? 'rotateX(0deg)' 
                    : 'rotateX(5deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = weeklySchedule[entityId as keyof typeof weeklySchedule] 
                    ? 'rotateX(0deg)' 
                    : 'rotateX(5deg)';
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather & Status Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">Outside {processedEntities['weather.home']?.state || 'sunny'}</p>
              <p className="text-2xl font-bold">{Math.round(parseFloat(processedEntities['sensor.garagedoor_driveway_temp']?.state || '78'))}°F</p>
              <p className="text-xs text-gray-500">Driveway</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">Jax</p>
              <p className="text-2xl font-bold">{Math.round(parseFloat(processedEntities['sensor.jax_temp']?.state || '72'))}°F</p>
              <p className="text-xs text-gray-500">Indoor</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">Last run</p>
              <p className="text-sm font-bold">Today 6:00 AM</p>
              <p className="text-xs text-gray-500">Auto Schedule</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">Uptime</p>
              <p className="text-lg font-bold">{processedEntities['sensor.sprinkler_uptime']?.state || '72 hours'}</p>
              <p className="text-xs text-gray-500">System</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Switches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200" 
              style={{ 
                background: isSystemPowered() ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                boxShadow: '0px 0px 5px 2px #f3f6f4'
              }}>
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => toggleEntity('switch.sprinkler_power')}
              variant="ghost"
              className="w-full h-20 flex-col space-y-2 hover:bg-transparent transform transition-all duration-150"
              style={{ perspective: '900px' }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'rotateX(30deg)';
                e.currentTarget.style.transformOrigin = 'center bottom';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
            >
              {isSystemPowered() ? (
                <Power className="h-8 w-8 text-red-500" />
              ) : (
                <PowerOff className="h-8 w-8 text-green-500" />
              )}
              <div>
                <p className="font-semibold">System Power</p>
                <p className="text-sm text-gray-600">
                  {isSystemPowered() ? 'Standby' : 'Idle'}
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200"
              style={{ 
                background: !isRainDelay() ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                boxShadow: '0px 0px 5px 2px #f3f6f4'
              }}>
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => toggleEntity('switch.sprinkler_rain_delay')}
              variant="ghost"
              className="w-full h-20 flex-col space-y-2 hover:bg-transparent transform transition-all duration-150"
              style={{ perspective: '900px' }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'rotateX(30deg)';
                e.currentTarget.style.transformOrigin = 'center bottom';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
            >
              {!isRainDelay() ? (
                <Sun className="h-8 w-8 text-green-500" />
              ) : (
                <CloudRain className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className="font-semibold">Rain Status</p>
                <p className="text-sm text-gray-600">
                  {!isRainDelay() ? 'No rain' : 'Rain'}
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200"
              style={{ 
                background: !isAutoAdvance() ? 'rgba(255, 152, 0, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                boxShadow: '0px 0px 5px 2px #f3f6f4'
              }}>
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => toggleEntity('switch.sprinkler_auto_advance')}
              variant="ghost"
              className="w-full h-20 flex-col space-y-2 hover:bg-transparent transform transition-all duration-150"
              style={{ perspective: '900px' }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'rotateX(30deg)';
                e.currentTarget.style.transformOrigin = 'center bottom';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
            >
              {isAutoAdvance() ? (
                <RefreshCw className="h-8 w-8 text-green-500" />
              ) : (
                <RefreshCw className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <p className="font-semibold">Auto Advance</p>
                <p className="text-sm text-gray-600">
                  {isAutoAdvance() ? 'Auto' : 'Manual'}
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Control Buttons */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {controlButtons.map(({ entityId, icon: Icon, label }) => (
              <Button
                key={entityId}
                onClick={() => triggerButton(entityId)}
                variant="ghost"
                className="h-16 flex-col space-y-1 border-0 shadow-sm transform transition-all duration-150 active:scale-95"
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
                  background: 'none',
                  marginBottom: '5px',
                  transform: 'rotateX(0deg)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'rotateX(50deg)';
                  e.currentTarget.style.transformOrigin = 'center bottom';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'rotateX(0deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'rotateX(0deg)';
                }}
              >
                <Icon className="h-5 w-5 text-amber-600" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Zone Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {zones.map((zone) => {
          const isRunning = isZoneRunning(zone.id);
          return (
            <Card key={zone.id} className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-4">
                <Button
                  onClick={() => toggleEntity(zone.entityId)}
                  variant="ghost"
                  className="w-full h-full p-0 flex-col space-y-2 hover:bg-transparent"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="relative">
                      {isRunning ? (
                        <>
                          <Sprout className="h-6 w-6 text-emerald-500" />
                          <div className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping" />
                        </>
                      ) : (
                        <Droplets className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">
                        {isRunning ? `${zone.name} running` : `${zone.name} Idle`}
                      </p>
                      <p className="text-xs text-gray-500 text-center">
                        {processedEntities[zone.entityId]?.state || 'off'}
                      </p>
                    </div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Zone Timers */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {zones.map((zone) => (
              <div key={zone.id} className="space-y-2">
                <Label htmlFor={`timer-${zone.id}`} className="text-sm font-medium">
                  {zone.name}
                </Label>
                <Input
                  id={`timer-${zone.id}`}
                  type="number"
                  value={processedEntities[zone.timerEntity]?.state || '0'}
                  onChange={(e) => updateNumberEntity(zone.timerEntity, e.target.value)}
                  min="0"
                  max="60"
                  className="text-center border-gray-200 focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'none',
            height: '75px',
            marginBottom: '5px'
          }}>
            <p className="text-lg font-bold">{processedEntities['sensor.sprinkler_zones_status']?.state || '0/5 running'}</p>
            <p className="text-xs text-gray-500">Zone Status</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'none',
            height: '75px',
            marginBottom: '5px'
          }}>
            <p className="text-lg font-bold">{processedEntities['sensor.sprinkler_total_time']?.state || '65 min'}</p>
            <p className="text-xs text-gray-500">Total Time</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'none',
            height: '75px',
            marginBottom: '5px'
          }}>
            <p className="text-sm font-semibold">Time left</p>
            <p className="text-lg font-bold">{processedEntities['sensor.sprinkler_zone_time_remaining']?.state || '0 min'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => triggerButton('button.sprinkler_sys_restart')}
              variant="ghost"
              className="w-full h-full text-center transform transition-all duration-150"
              style={{
                padding: '10px',
                borderRadius: '10px',
                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
                background: 'none',
                height: '75px',
                marginBottom: '5px'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'rotateX(50deg)';
                e.currentTarget.style.transformOrigin = 'center bottom';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateX(0deg)';
              }}
            >
              <div>
                <RotateCcw className="h-5 w-5 mx-auto mb-1" />
                <p className="text-sm font-semibold">Restart</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'transparent',
            height: '75px',
            marginBottom: '5px'
          }}>
            <div className="space-y-2">
              <Settings className="h-5 w-5 mx-auto text-amber-600" />
              <p className="text-sm font-semibold">Schedule</p>
              <p className="text-xs text-gray-500">{processedEntities['select.sprinkler_schedule']?.state || 'daily'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'transparent',
            height: '75px',
            marginBottom: '5px'
          }}>
            <div className="space-y-2">
              <CloudRain className="h-5 w-5 mx-auto text-amber-600" />
              <p className="text-sm font-semibold">Rain delay</p>
              <p className="text-xs text-gray-500">{processedEntities['select.sprinkler_rain_delay']?.state || '0 hours'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center" style={{
            padding: '10px',
            borderRadius: '10px',
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.3)',
            background: 'transparent',
            height: '75px',
            marginBottom: '5px'
          }}>
            <div className="space-y-2">
              <RefreshCw className="h-5 w-5 mx-auto text-amber-600" />
              <p className="text-sm font-semibold">Repeat</p>
              <p className="text-xs text-gray-500">{processedEntities['number.sprinkler_repeat']?.state || '1'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}