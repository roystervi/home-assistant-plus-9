// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: src/components/pages/AlarmPanel.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";
import { AlarmKeypad } from "@/components/ui/alarm-keypad";
import { 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  DoorOpen,
  DoorClosed,
  AlertTriangle,
  CheckCircle,
  Clock,
  Home,
  LockOpen,
  PanelLeft,
  AlarmClock,
  AlarmClockOff,
  AlarmClockPlus,
  AlarmClockMinus,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { pinSecurity } from "@/lib/security";

// Home Assistant Alarm Entity ID
const ALARM_ENTITY_ID = "alarm_control_panel.home_alarm";

// Real Door and Window Entity IDs
const DOOR_ENTITIES = [
  'binary_sensor.front_door',
  'binary_sensor.laundry_door',
  'binary_sensor.rear_door'
];

const WINDOW_ENTITIES = [
  'binary_sensor.living_room_window',
  'binary_sensor.masterbed_window',
  'binary_sensor.masterbath_window',
  'binary_sensor.bathroom_window',
  'binary_sensor.kitchen_window',
  'binary_sensor.den_single_window',
  'binary_sensor.den_rear_windows',
  'binary_sensor.laundry_rear_window',
  'binary_sensor.laundry_side_window'
];

// All sensor entities combined
const ALL_SENSOR_ENTITIES = [...DOOR_ENTITIES, ...WINDOW_ENTITIES];

// Alarm state mapping from Home Assistant
type HAAlarmState = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered' | 'arming' | 'disarming';
type KeypadState = 'disarmed' | 'armed-home' | 'armed-away' | 'alarm' | 'error' | 'pending';

export default function AlarmPanel() {
  const { 
    isConnected, 
    entities, 
    callService, 
    searchEntities, 
    error: haError,
    retryConnection 
  } = useHomeAssistant();

  // Local state
  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Get alarm entity from Home Assistant
  const alarmEntity = entities[ALARM_ENTITY_ID];
  
  // Get real sensor entities from Home Assistant
  const allEntities = Object.values(entities);
  
  // Filter for actual door sensors based on our entity IDs
  const doorSensors = DOOR_ENTITIES.map(entityId => entities[entityId]).filter(Boolean);
  
  // Filter for actual window sensors based on our entity IDs
  const windowSensors = WINDOW_ENTITIES.map(entityId => entities[entityId]).filter(Boolean);
  
  // Get any motion sensors from HA (device_class = motion)
  const motionSensors = allEntities.filter(entity => 
    entity.attributes?.device_class === 'motion' && 
    entity.entity_id.includes('motion')
  );

  // Convert HA alarm state to keypad state
  const getKeypadState = useCallback((): KeypadState => {
    if (!alarmEntity) return 'error';
    
    const state = alarmEntity.state as HAAlarmState;
    switch (state) {
      case 'disarmed': return 'disarmed';
      case 'armed_home': return 'armed-home';
      case 'armed_away': return 'armed-away';
      case 'armed_night': return 'armed-home'; // Treat night as home mode
      case 'pending':
      case 'arming':
      case 'disarming': return 'pending';
      case 'triggered': return 'alarm';
      default: return 'error';
    }
  }, [alarmEntity]);

  // Handle digit press for keypad
  const handleDigitPress = (digit: string) => {
    if (pinCode.length < 6) {
      setPinCode(pinCode + digit);
    }
  };

  // Clear PIN
  const clearPin = () => {
    setPinCode("");
    setErrorMessage(null);
  };

  // Submit PIN and perform action
  const submitPin = async () => {
    if (!pinCode) {
      setErrorMessage("Please enter a PIN code");
      return;
    }

    // For local PIN validation (if needed as backup)
    const pinValidation = pinSecurity.validatePIN(pinCode);
    if (!pinValidation.success && pinValidation.lockoutUntil) {
      setErrorMessage(`Account locked until ${pinValidation.lockoutUntil.toLocaleTimeString()}`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const currentState = alarmEntity?.state as HAAlarmState;
      
      if (currentState === 'disarmed') {
        // If disarmed, arm home by default
        await armHome();
      } else {
        // If armed, disarm
        await disarm();
      }
    } catch (error) {
      console.error('PIN submit error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsLoading(false);
      setPinCode(""); // Clear PIN after action
    }
  };

  // Arm alarm in home mode
  const armHome = async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await callService('alarm_control_panel', 'alarm_arm_home', {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode || undefined
      });
      
      setLastUpdate(new Date());
      clearPin();
    } catch (error) {
      console.error('Arm home error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to arm alarm');
    } finally {
      setIsLoading(false);
    }
  };

  // Arm alarm in away mode
  const armAway = async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await callService('alarm_control_panel', 'alarm_arm_away', {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode || undefined
      });
      
      setLastUpdate(new Date());
      clearPin();
    } catch (error) {
      console.error('Arm away error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to arm alarm');
    } finally {
      setIsLoading(false);
    }
  };

  // Disarm alarm
  const disarm = async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    if (!pinCode) {
      setErrorMessage("PIN code required to disarm");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await callService('alarm_control_panel', 'alarm_disarm', {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode
      });
      
      setLastUpdate(new Date());
      clearPin();
    } catch (error) {
      console.error('Disarm error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to disarm alarm - check PIN');
    } finally {
      setIsLoading(false);
    }
  };

  // Panic/trigger alarm
  const panic = async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const serviceData = {
        entity_id: ALARM_ENTITY_ID
      };
      
      console.log('Calling alarm_trigger service with:', serviceData);
      await callService('alarm_control_panel', 'alarm_trigger', serviceData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Panic error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to trigger alarm');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!alarmEntity) {
      return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }

    const state = alarmEntity.state as HAAlarmState;
    switch (state) {
      case 'disarmed':
        return <ShieldOff className="h-6 w-6 text-green-500" />;
      case 'armed_home':
      case 'armed_night':
        return <ShieldCheck className="h-6 w-6 text-blue-500" />;
      case 'armed_away':
        return <Shield className="h-6 w-6 text-orange-500" />;
      case 'pending':
      case 'arming':
      case 'disarming':
        return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case 'triggered':
        return <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (!alarmEntity) return 'text-red-500';

    const state = alarmEntity.state as HAAlarmState;
    switch (state) {
      case 'disarmed': return 'text-green-500';
      case 'armed_home':
      case 'armed_night': return 'text-blue-500';
      case 'armed_away': return 'text-orange-500';
      case 'pending':
      case 'arming':
      case 'disarming': return 'text-yellow-500';
      case 'triggered': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!alarmEntity) return 'OFFLINE';

    const state = alarmEntity.state as HAAlarmState;
    switch (state) {
      case 'disarmed': return 'DISARMED';
      case 'armed_home': return 'ARMED HOME';
      case 'armed_night': return 'ARMED NIGHT';
      case 'armed_away': return 'ARMED AWAY';
      case 'pending': return 'PENDING';
      case 'arming': return 'ARMING';
      case 'disarming': return 'DISARMING';
      case 'triggered': return 'ALARM!';
      default: return 'UNKNOWN';
    }
  };

  // Check if doors/windows are open
  const getOpenDoorsCount = () => {
    return doorSensors.filter(sensor => sensor.state === 'on').length;
  };

  const getOpenWindowsCount = () => {
    return windowSensors.filter(sensor => sensor.state === 'on').length;
  };

  // Get sensor display name
  const getSensorDisplayName = (entityId: string) => {
    const entity = entities[entityId];
    if (entity?.attributes?.friendly_name) {
      return entity.attributes.friendly_name;
    }
    // Convert entity_id to readable name
    return entityId
      .replace('binary_sensor.', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Auto-clear errors and update timestamps
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Show connection error if HA error exists
  useEffect(() => {
    if (haError && !errorMessage) {
      setErrorMessage(haError);
    }
  }, [haError, errorMessage]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
              Security System
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor and control your home security system
              {errorMessage && (
                <span className="text-destructive"> • {errorMessage}</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
            <Badge variant="outline" className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {isConnected ? 'Connected' : 'Offline'}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              {doorSensors.length + windowSensors.length + motionSensors.length} Sensors
            </Badge>
          </div>
        </div>
      </div>

      {/* Connection Status Warning */}
      {!isConnected && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Not connected to Home Assistant
                </span>
              </div>
              <Button onClick={retryConnection} variant="outline" size="sm">
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Alarm Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alarm Keypad */}
        <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '250px' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl flex items-center gap-3">
              {getStatusIcon()}
              <span className={getStatusColor()}>{getStatusText()}</span>
            </CardTitle>
            {alarmEntity && (
              <p className="text-sm text-muted-foreground">
                Entity: {alarmEntity.entity_id} • Last changed: {new Date(alarmEntity.last_changed).toLocaleTimeString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <AlarmKeypad
              alarmState={getKeypadState()}
              pinValue={pinCode}
              errorMessage={errorMessage}
              isLoading={isLoading}
              onDigitPress={handleDigitPress}
              onClear={clearPin}
              onSubmit={submitPin}
              onArmHome={armHome}
              onArmAway={armAway}
              onDisarm={disarm}
              onPanic={panic}
              compact={true}
            />
          </CardContent>
        </Card>

        {/* System Status & Quick Actions */}
        <div className="space-y-4">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {getOpenDoorsCount()}
                  </div>
                  <div className="text-sm text-muted-foreground">Doors Open</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {getOpenWindowsCount()}
                  </div>
                  <div className="text-sm text-muted-foreground">Windows Open</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Alarm Panel Status</span>
                </div>
                <Badge variant={alarmEntity ? "default" : "destructive"}>
                  {alarmEntity ? "Online" : "Offline"}
                </Badge>
              </div>

              {alarmEntity && alarmEntity.attributes.bypassed_sensors && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Bypassed Sensors</span>
                  </div>
                  <Badge variant="secondary">
                    {alarmEntity.attributes.bypassed_sensors.length}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlarmClock className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => setPinCode("1234")}
                  disabled={isLoading || !isConnected}
                >
                  <AlarmClockPlus className="h-4 w-4 mr-2" />
                  Demo PIN
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={clearPin}
                  disabled={isLoading}
                >
                  <AlarmClockMinus className="h-4 w-4 mr-2" />
                  Clear PIN
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => {
                  const currentState = alarmEntity?.state as HAAlarmState;
                  if (currentState === 'disarmed') {
                    armHome();
                  } else {
                    disarm();
                  }
                }}
                disabled={isLoading || !isConnected || !alarmEntity}
              >
                {alarmEntity?.state === 'disarmed' ? (
                  <>
                    <LockOpen className="h-4 w-4 mr-2" />
                    Quick Arm Home
                  </>
                ) : (
                  <>
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Quick Disarm
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real Sensor Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Door Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorClosed className="h-5 w-5" />
              Door Sensors ({doorSensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doorSensors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No door sensors found in Home Assistant</p>
            ) : (
              doorSensors.map((door) => (
                <div key={door.entity_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {door.state === 'on' ? (
                      <DoorOpen className="h-4 w-4 text-red-500" />
                    ) : (
                      <DoorClosed className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      {getSensorDisplayName(door.entity_id)}
                    </span>
                  </div>
                  <Badge variant={door.state === 'on' ? "destructive" : "default"}>
                    {door.state === 'on' ? 'Open' : 'Closed'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Window Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Window Sensors ({windowSensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {windowSensors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No window sensors found in Home Assistant</p>
            ) : (
              windowSensors.map((window) => (
                <div key={window.entity_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${window.state === 'on' ? 'bg-orange-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-medium">
                      {getSensorDisplayName(window.entity_id)}
                    </span>
                  </div>
                  <Badge variant={window.state === 'on' ? "secondary" : "default"}>
                    {window.state === 'on' ? 'Open' : 'Closed'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Motion Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PanelLeft className="h-5 w-5" />
              Motion Sensors ({motionSensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {motionSensors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No motion sensors found in Home Assistant</p>
            ) : (
              motionSensors.map((motion) => (
                <div key={motion.entity_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${motion.state === 'on' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-sm font-medium">
                      {motion.attributes.friendly_name || motion.entity_id.replace('binary_sensor.', '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Badge variant={motion.state === 'on' ? "destructive" : "default"}>
                    {motion.state === 'on' ? 'Motion' : 'Clear'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Home Assistant Integration Status */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Home Assistant Integration Status</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>🏠 Alarm Entity: {ALARM_ENTITY_ID} ({alarmEntity ? 'Found' : 'Not Found'})</div>
          <div>🔗 Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
          <div>🛡️ Alarm State: {alarmEntity?.state?.toUpperCase() || 'UNKNOWN'}</div>
          <div>🚪 Door Entities: {doorSensors.length}/{DOOR_ENTITIES.length} found</div>
          <div>🪟 Window Entities: {windowSensors.length}/{WINDOW_ENTITIES.length} found</div>
          <div>🏃 Motion Entities: {motionSensors.length} found</div>
          <div>📡 Last Update: {lastUpdate.toLocaleTimeString()}</div>
          <div>⚡ Refresh Rate: Every 1 second (Real-time Security Mode)</div>
          {alarmEntity && (
            <div>🕒 Last Changed: {new Date(alarmEntity.last_changed).toLocaleString()}</div>
          )}
          {!isConnected && (
            <div className="text-yellow-600">⚠️ Check Home Assistant connection in Settings → Home Assistant</div>
          )}
          {isConnected && doorSensors.length === 0 && windowSensors.length === 0 && (
            <div className="text-yellow-600">⚠️ No sensors found - verify entity IDs in Home Assistant</div>
          )}
        </div>
        
        {/* Debug Information */}
        {(doorSensors.length > 0 || windowSensors.length > 0) && (
          <details className="mt-3">
            <summary className="text-xs font-medium cursor-pointer text-primary">Debug Information</summary>
            <div className="mt-2 space-y-2 text-xs">
              {doorSensors.length > 0 && (
                <div>
                  <strong>Door Sensors:</strong>
                  {doorSensors.map(sensor => (
                    <div key={sensor.entity_id} className="ml-2 text-muted-foreground">
                      {sensor.entity_id}: state="{sensor.state}", device_class="{sensor.attributes?.device_class || 'none'}"
                    </div>
                  ))}
                </div>
              )}
              {windowSensors.length > 0 && (
                <div>
                  <strong>Window Sensors:</strong>
                  {windowSensors.slice(0, 3).map(sensor => (
                    <div key={sensor.entity_id} className="ml-2 text-muted-foreground">
                      {sensor.entity_id}: state="{sensor.state}", device_class="{sensor.attributes?.device_class || 'none'}"
                    </div>
                  ))}
                  {windowSensors.length > 3 && (
                    <div className="ml-2 text-muted-foreground">...and {windowSensors.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}