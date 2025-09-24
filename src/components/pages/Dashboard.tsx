// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/pages/Dashboard.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";
import { useThermostat } from "@/contexts/ThermostatContext";
import { ThermostatCard } from "@/components/ui/thermostat-card";
import { AlarmKeypad } from "@/components/ui/alarm-keypad";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { 
  Zap, 
  Calendar, 
  DoorOpen, 
  TrendingUp,
  TrendingDown,
  Bell,
  Camera,
  Settings,
  Sun,
  Cloud,
  CloudRain,
  Home,
  Coins,
  Monitor,
  Thermometer
} from "lucide-react";
import { BackgroundColorCard } from "@/components/ui/background-color-card";

// HOME ASSISTANT ALARM ENTITY ID
const ALARM_ENTITY_ID = "alarm_control_panel.home_alarm";

// Alarm state mapping from Home Assistant
type HAAlarmState = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered' | 'arming' | 'disarming';
type KeypadState = 'disarmed' | 'armed-home' | 'armed-away' | 'alarm' | 'error';

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

interface EnergyData {
  current: number;
  daily: number;
  monthly: number;
  trend: "up" | "down";
  percentage: number;
}

interface AgendaItem {
  id: string;
  title: string;
  time: string;
  type: "event" | "medication" | "reminder";
}

interface CryptoAsset {
  entityId: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  type: "motion" | "door" | "automation" | "system";
  icon: React.ComponentType<any>;
}

// Your crypto entities from Home Assistant
const CRYPTO_ENTITIES = [
  { entityId: "sensor.jasmy", name: "JasmyCoin", symbol: "JASMY", color: "bg-green-500" },
  { entityId: "sensor.shiba_inu", name: "Shiba Inu", symbol: "SHIB", color: "bg-orange-500" },
  { entityId: "sensor.doge", name: "Dogecoin", symbol: "DOGE", color: "bg-yellow-500" },
  { entityId: "sensor.cronos", name: "Cronos", symbol: "CRO", color: "bg-blue-500" },
  { entityId: "sensor.algorand", name: "Algorand", symbol: "ALGO", color: "bg-purple-500" },
  { entityId: "sensor.dogelon_mars", name: "Dogelon Mars", symbol: "ELON", color: "bg-red-500" },
  { entityId: "sensor.xrp", name: "XRP", symbol: "XRP", color: "bg-indigo-500" },
  { entityId: "sensor.spell", name: "Spell Token", symbol: "SPELL", color: "bg-pink-500" },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { entities, isConnected, retryConnection, callService } = useHomeAssistant();
  const { getThermostat, updateTargetTemp, thermostats, isLoading: thermostatLoading, error: thermostatError } = useThermostat();
  
  // REAL HOME ASSISTANT ALARM STATE - REMOVED AlarmContext
  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAlarmLoading, setIsAlarmLoading] = useState(false);
  
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 72,
    condition: "Partly Cloudy",
    icon: "partly-cloudy",
    humidity: 45,
    windSpeed: 8
  });

  const [energy, setEnergy] = useState<EnergyData>({
    current: 3.2,
    daily: 28.5,
    monthly: 856,
    trend: "down",
    percentage: -15
  });

  const [agenda, setAgenda] = useState<AgendaItem[]>([
    { id: "1", title: "Team Meeting", time: "10:00 AM", type: "event" },
    { id: "2", title: "Blood Pressure Medication", time: "12:00 PM", type: "medication" },
    { id: "3", title: "Grocery Shopping", time: "3:00 PM", type: "reminder" },
    { id: "4", title: "Vitamin D", time: "8:00 PM", type: "medication" }
  ]);

  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    { id: "1", title: "Motion detected in living room", time: "2 min ago", type: "motion", icon: Camera },
    { id: "2", title: "Front door opened", time: "15 min ago", type: "door", icon: DoorOpen },
    { id: "3", title: "Evening routine activated", time: "1 hour ago", type: "automation", icon: Home },
    { id: "4", title: "System backup completed", time: "2 hours ago", type: "system", icon: Settings }
  ]);

  // Get main thermostat data from shared context
  const mainThermostat = getThermostat("climate.bobby");

  // GET REAL ALARM ENTITY FROM HOME ASSISTANT
  const alarmEntity = entities[ALARM_ENTITY_ID];

  const getEntity = useCallback((entityId: string) => {
    return entities[entityId] || null;
  }, [entities]);

  // REAL HOME ASSISTANT ALARM FUNCTIONS
  const clearPin = useCallback(() => {
    setPinCode("");
    setErrorMessage("");
  }, []);

  const submitPin = useCallback(async () => {
    if (!pinCode || pinCode.trim().length < 4) {
      setErrorMessage("Please enter a valid PIN code");
      return;
    }

    setIsAlarmLoading(true);
    setErrorMessage("");

    try {
      const currentState = alarmEntity?.state as HAAlarmState;
      
      if (currentState === 'disarmed') {
        await armHome();
      } else {
        await disarm();
      }
    } catch (error) {
      console.error('PIN submit error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsAlarmLoading(false);
    }
  }, [pinCode, alarmEntity]);

  const armHome = useCallback(async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    if (!pinCode || pinCode.trim().length < 4) {
      setErrorMessage("PIN code required to arm system");
      return;
    }

    setIsAlarmLoading(true);
    setErrorMessage("");

    try {
      const serviceData = {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode.trim()
      };
      
      await callService('alarm_control_panel', 'alarm_arm_home', serviceData);
      
      clearPin();
      setErrorMessage("System armed HOME");
      toast.success("System armed in HOME mode");
    } catch (error) {
      console.error('Arm home error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to arm alarm - check PIN');
      toast.error("Failed to arm system - check PIN");
    } finally {
      setIsAlarmLoading(false);
    }
  }, [pinCode, alarmEntity, isConnected, callService, clearPin]);

  const armAway = useCallback(async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    if (!pinCode || pinCode.trim().length < 4) {
      setErrorMessage("PIN code required to arm system");
      return;
    }

    setIsAlarmLoading(true);
    setErrorMessage("");

    try {
      const serviceData = {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode.trim()
      };
      
      await callService('alarm_control_panel', 'alarm_arm_away', serviceData);
      
      clearPin();
      setErrorMessage("System armed AWAY");
      toast.success("System armed in AWAY mode");
    } catch (error) {
      console.error('Arm away error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to arm alarm - check PIN');
      toast.error("Failed to arm system - check PIN");
    } finally {
      setIsAlarmLoading(false);
    }
  }, [pinCode, alarmEntity, isConnected, callService, clearPin]);

  const disarm = useCallback(async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    if (!pinCode || pinCode.trim().length < 4) {
      setErrorMessage("PIN code required to disarm");
      return;
    }

    setIsAlarmLoading(true);
    setErrorMessage("");

    try {
      const serviceData = {
        entity_id: ALARM_ENTITY_ID,
        code: pinCode.trim()
      };
      
      await callService('alarm_control_panel', 'alarm_disarm', serviceData);
      
      clearPin();
      setErrorMessage("System disarmed");
      toast.success("System disarmed");
    } catch (error) {
      console.error('Disarm error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to disarm alarm - check PIN');
      toast.error("Failed to disarm system - check PIN");
    } finally {
      setIsAlarmLoading(false);
    }
  }, [pinCode, alarmEntity, isConnected, callService, clearPin]);

  const panic = useCallback(async () => {
    if (!isConnected || !alarmEntity) {
      setErrorMessage("Not connected to Home Assistant");
      return;
    }

    if (!confirm('Are you sure you want to trigger the alarm? This will activate the panic mode.')) {
      return;
    }

    setIsAlarmLoading(true);
    setErrorMessage("");

    try {
      const serviceData = {
        entity_id: ALARM_ENTITY_ID
      };
      
      await callService('alarm_control_panel', 'alarm_trigger', serviceData);
      setErrorMessage("PANIC ALARM ACTIVATED!");
      toast.error("PANIC ALARM ACTIVATED!");
    } catch (error) {
      console.error('Panic error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to trigger alarm');
      toast.error("Failed to trigger alarm");
    } finally {
      setIsAlarmLoading(false);
    }
  }, [alarmEntity, isConnected, callService]);

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
      case 'disarming': return 'disarmed'; // Show as disarmed during transitions
      case 'triggered': return 'alarm';
      default: return 'error';
    }
  }, [alarmEntity]);

  const loadCryptoData = useCallback(async () => {
    if (!isConnected) {
      await retryConnection();
      return;
    }

    try {
      const cryptoData: CryptoAsset[] = [];
      
      for (const crypto of CRYPTO_ENTITIES) {
        const entityData = getEntity(crypto.entityId);
        
        if (entityData) {
          const price = parseFloat(entityData.state) || 0;
          const previousPrice = parseFloat(entityData.attributes?.previous_state || entityData.state) || price;
          const change = previousPrice !== 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;
          
          cryptoData.push({
            entityId: crypto.entityId,
            name: crypto.name,
            symbol: crypto.symbol,
            price: price,
            change: change,
            icon: Coins,
            color: crypto.color
          });
        } else {
          // Fallback if entity is not available
          cryptoData.push({
            entityId: crypto.entityId,
            name: crypto.name,
            symbol: crypto.symbol,
            price: 0,
            change: 0,
            icon: Coins,
            color: crypto.color
          });
        }
      }
      
      setCryptoAssets(cryptoData);
    } catch (error) {
      // Set default data with zero values if HA is not available
      const defaultCrypto = CRYPTO_ENTITIES.map(crypto => ({
        entityId: crypto.entityId,
        name: crypto.name,
        symbol: crypto.symbol,
        price: 0,
        change: 0,
        icon: Coins,
        color: crypto.color
      }));
      setCryptoAssets(defaultCrypto);
    }
  }, [isConnected, retryConnection, getEntity]);

  // Handle thermostat temperature change using shared context
  const handleThermostatTempChange = useCallback(async (newTemp: number) => {
    if (mainThermostat) {
      await updateTargetTemp(mainThermostat.entity_id, newTemp);
    }
  }, [mainThermostat, updateTargetTemp]);

  // Handle alarm keypad digit press - REAL HOME ASSISTANT INTEGRATION
  const handleKeypadDigit = useCallback((digit: string) => {
    if (pinCode.length < 6) {
      setPinCode(pinCode + digit);
    }
  }, [pinCode]);

  // Auto-clear errors
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    // Initial data loading
    const timer = setTimeout(async () => {
      await loadCryptoData();
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [loadCryptoData]);

  useEffect(() => {
    if (!loading) {
      const interval = setInterval(loadCryptoData, 30000);
      return () => clearInterval(interval);
    }
  }, [loading, loadCryptoData]);

  const getWeatherIcon = () => {
    switch (weather.icon) {
      case "sunny": return <Sun className="h-8 w-8 text-yellow-500" />;
      case "cloudy": return <Cloud className="h-8 w-8 text-gray-500" />;
      case "rainy": return <CloudRain className="h-8 w-8 text-blue-500" />;
      default: return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getAgendaIcon = (type: string) => {
    switch (type) {
      case "event": return <Calendar className="h-4 w-4" />;
      case "medication": return <Bell className="h-4 w-4" />;
      case "reminder": return <Bell className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getAgendaBadgeColor = (type: string) => {
    switch (type) {
      case "event": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "medication": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "reminder": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const formatPrice = (price: number, symbol: string) => {
    if (price === 0) return "N/A";
    
    // Format based on typical price ranges for each crypto
    if (symbol === "SHIB" || symbol === "ELON" || symbol === "SPELL") {
      return `$${price.toFixed(8)}`; // Very small decimals
    } else if (symbol === "DOGE" || symbol === "JASMY") {
      return `$${price.toFixed(4)}`; // Small decimals
    } else {
      return `$${price.toFixed(2)}`; // Standard decimals
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP ROW - Compact Height Cards - REAL HOME ASSISTANT INTEGRATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thermostat - Using Shared State */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '250px' }}>
            {mainThermostat ? (
              <ThermostatCard
                entity_id={mainThermostat.entity_id}
                name={mainThermostat.name}
                current_temp={mainThermostat.current_temp}
                target_temp={mainThermostat.target_temp}
                humidity={mainThermostat.humidity}
                mode={mainThermostat.mode}
                hvac_action={mainThermostat.hvac_action}
                onTargetTempChange={handleThermostatTempChange}
                compact={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium mb-2">
                    {thermostatLoading ? "Loading Thermostat..." : 
                     thermostatError ? "Thermostat Error" : 
                     !isConnected ? "Home Assistant Disconnected" : 
                     "No Thermostat Found"}
                  </div>
                  {thermostatError && (
                    <div className="text-sm text-red-500 mb-2">{thermostatError}</div>
                  )}
                  <div className="text-sm">
                    {!isConnected ? "Connect to Home Assistant to view thermostat" :
                     thermostatError ? "Check entity configuration" :
                     "Looking for climate.bobby entity..."}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Alarm Panel Keypad - REAL HOME ASSISTANT INTEGRATION */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '250px' }}>
            <div className="text-xs text-muted-foreground mb-2 text-center">
              {alarmEntity ? (
                <span className="text-green-600">
                  🏠 Connected to {alarmEntity.entity_id} • {alarmEntity.state.toUpperCase()}
                </span>
              ) : (
                <span className="text-red-600">
                  ⚠️ alarm_control_panel.home_alarm not found
                </span>
              )}
            </div>
            <AlarmKeypad
              alarmState={getKeypadState()}
              pinValue={pinCode}
              errorMessage={errorMessage}
              isLoading={isAlarmLoading}
              onDigitPress={handleKeypadDigit}
              onClear={clearPin}
              onSubmit={submitPin}
              onArmHome={armHome}
              onArmAway={armAway}
              onDisarm={disarm}
              onPanic={panic}
              compact={true}
            />
          </Card>
        </div>
      </div>

      {/* SECOND ROW - Original Height Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Energy Usage */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '337px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Energy Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold">{energy.current}</span>
                  <span className="text-muted-foreground">kW</span>
                </div>
                <div className="flex items-center space-x-2">
                  {energy.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  <span className={`text-sm ${energy.percentage > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {energy.percentage > 0 ? '+' : ''}{energy.percentage}% from yesterday
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Daily: {energy.daily} kWh • Monthly: {energy.monthly} kWh
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Agenda */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '337px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Today's Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agenda.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getAgendaIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                    <Badge className={`text-xs ${getAgendaBadgeColor(item.type)}`}>
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* THIRD ROW - Original Height Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Crypto Portfolio */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '337px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Coins className="h-5 w-5 text-orange-500" />
                Crypto Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cryptoAssets.length > 0 ? (
                  cryptoAssets.map((asset, index) => (
                    <div key={`${asset.entityId}-${index}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${asset.color}`} />
                        <div>
                          <span className="text-sm font-medium">{asset.name}</span>
                          <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatPrice(asset.price, asset.symbol)}
                        </div>
                        <div className={`text-xs flex items-center ${
                          asset.change > 0 ? 'text-green-500' : 
                          asset.change < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {asset.change > 0 && <TrendingUp className="h-3 w-3 mr-1" />}
                          {asset.change < 0 && <TrendingDown className="h-3 w-3 mr-1" />}
                          {asset.change !== 0 ? `${asset.change > 0 ? '+' : ''}${asset.change.toFixed(2)}%` : 'No change'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Coins className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {isConnected ? "Loading crypto data..." : "Connect to Home Assistant to view crypto data"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="md:col-span-1">
          <Card className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full" style={{ minHeight: '337px' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-green-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Background Settings Card */}
      <div className="grid grid-cols-1 gap-6">
        <BackgroundColorCard />
      </div>
    </div>
  );
}