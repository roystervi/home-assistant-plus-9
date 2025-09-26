// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/pages/Dashboard.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { storage, WeatherApiSettings } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHomeAssistant } from "@/contexts/HomeAssistantContext";
import { useThermostat } from "@/contexts/ThermostatContext";
import { ThermostatCard } from "@/components/ui/thermostat-card";
import { AlarmKeypad } from "@/components/ui/alarm-keypad";
import { useRouter } from "next/navigation";
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
  Thermometer,
  ThermometerSun
} from "lucide-react";

// HOME ASSISTANT ALARM ENTITY ID
const ALARM_ENTITY_ID = "alarm_control_panel.home_alarm";

// Alarm state mapping from Home Assistant
type HAAlarmState = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered' | 'arming' | 'disarming';
type KeypadState = 'disarmed' | 'armed-home' | 'armed-away' | 'alarm' | 'error';

interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  name: string;
  sys: {
    country: string;
  };
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

// Define agenda items at module scope to avoid runtime reference issues
const AGENDA_ITEMS: AgendaItem[] = [
  { id: "a1", title: "Team standup", time: "9:00 AM", type: "event" },
  { id: "a2", title: "Take vitamins", time: "8:00 AM", type: "medication" },
  { id: "a3", title: "Pick up groceries", time: "5:30 PM", type: "reminder" },
  { id: "a4", title: "Dinner with Alex", time: "7:00 PM", type: "event" },
];

export default function Dashboard() {
  const router = useRouter();
  const { entities, isConnected, callService, retryConnection } = useHomeAssistant();
  const { getThermostat, thermostatLoading, thermostatError, updateTargetTemp } = useThermostat();

  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAlarmLoading, setIsAlarmLoading] = useState(false);
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Load settings
  const weatherSettings = storage.weather.get();
  const appearance = storage.appearance.get();

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

  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [cryptoAssets, setCryptoAssets] = useState<CryptoAsset[]>([]);

  const loadCryptoData = useCallback(async () => {
    setCryptoLoading(true);
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
    } finally {
      setCryptoLoading(false);
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
    loadCryptoData();
  }, [loadCryptoData]);

  useEffect(() => {
    if (cryptoAssets.length > 0) {
      const interval = setInterval(loadCryptoData, 30000);
      return () => clearInterval(interval);
    }
  }, [cryptoAssets.length, loadCryptoData]);

  const getWeatherDescription = (weatherArray: WeatherData["weather"]) => {
    if (weatherArray && weatherArray.length > 0) {
      return weatherArray[0].description;
    }
    return "Clear";
  };

  const getWeatherIconUrl = (icon: string) => {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  };

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    { id: "1", title: "Motion detected in living room", time: "2 min ago", type: "motion", icon: Camera },
    { id: "2", title: "Front door opened", time: "15 min ago", type: "door", icon: DoorOpen },
    { id: "3", title: "Evening routine activated", time: "1 hour ago", type: "automation", icon: Home },
    { id: "4", title: "System backup completed", time: "2 hours ago", type: "system", icon: Settings }
  ]);

  // Agenda data and helpers (fix ReferenceError: agenda is not defined)
  const agenda: AgendaItem[] = AGENDA_ITEMS;

  const getAgendaIcon = (type: AgendaItem["type"]) => {
    switch (type) {
      case "event":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "medication":
        return <Bell className="h-4 w-4 text-purple-500" />;
      case "reminder":
        return <Bell className="h-4 w-4 text-amber-500" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAgendaBadgeColor = (type: AgendaItem["type"]) => {
    switch (type) {
      case "event":
        return "bg-blue-100 text-blue-700";
      case "medication":
        return "bg-purple-100 text-purple-700";
      case "reminder":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-muted text-foreground";
    }
  };

  // Fetch weather data if OpenWeatherMap is configured
  useEffect(() => {
    const fetchWeather = async () => {
      if (weatherSettings.provider === "openweathermap" && weatherSettings.apiKey && weatherSettings.location.lat && weatherSettings.location.lon) {
        try {
          setWeatherLoading(true);
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${weatherSettings.location.lat}&lon=${weatherSettings.location.lon}&appid=${weatherSettings.apiKey}&units=${weatherSettings.units}`;
          
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const data: WeatherData = await res.json();
          setWeather(data);
          weatherSettings.lastUpdate = new Date().toISOString();
          storage.weather.set(weatherSettings);
          setWeatherError(null);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Network/error fetching weather";
          setWeatherError(errorMsg);
          toast.error(`Weather fetch failed: ${errorMsg}`);
          console.error("Weather API error:", error);
        } finally {
          setWeatherLoading(false);
        }
      } else {
        setWeatherLoading(false);
        if (!weatherSettings.apiKey) {
          toast.error("OpenWeatherMap API key not configured. Please add it in Settings.");
        }
      }
    };

    fetchWeather();

    // Poll every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [weatherSettings.apiKey, weatherSettings.location.lat, weatherSettings.location.lon, weatherSettings.units]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Settings className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Overview of your smart home</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Weather Widget - Independent of HA */}
        <section className="mb-8 rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ThermometerSun className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Weather</h2>
            </div>
            {weatherLoading ? (
              <p className="text-muted-foreground">Loading weather...</p>
            ) : weatherError ? (
              <Badge variant="destructive">Error</Badge>
            ) : null}
          </div>

          {weather ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{Math.round(weather.main.temp)}°</p>
                  <p className="text-lg capitalize">{getWeatherDescription(weather.weather)}</p>
                  <img src={getWeatherIconUrl(weather.weather[0].icon)} alt="Weather Icon" className="h-16 w-16" />
                </div>
                <div className="text-right">
                  <p className="text-sm">{weather.name}, {weather.sys.country}</p>
                  <p className="text-xs text-muted-foreground">Feels like {Math.round(weather.main.feels_like)}°</p>
                  <p className="text-xs text-muted-foreground">Humidity: {weather.main.humidity}%</p>
                </div>
              </div>
            </div>
          ) : weatherError ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Weather data unavailable</p>
              <p className="text-sm">{weatherError}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No weather data. Configure API key in Settings.</p>
            </div>
          )}
        </section>

        {/* Existing Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              ) : thermostatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium mb-2">Loading Thermostat...</div>
                    <div className="text-sm">Connecting to climate.bobby entity...</div>
                  </div>
                </div>
              ) : thermostatError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium mb-2">Thermostat Error</div>
                    <div className="text-sm text-red-500 mb-2">{thermostatError}</div>
                    <div className="text-sm">Check entity configuration</div>
                  </div>
                </div>
              ) : !isConnected ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium mb-2">Home Assistant Disconnected</div>
                    <div className="text-sm">Connect to Home Assistant to view thermostat</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium mb-2">No Thermostat Found</div>
                    <div className="text-sm">Looking for climate.bobby entity...</div>
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

          {/* Energy Card - Keep existing */}
          <Card className="space-y-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Energy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0 kWh</p>
              <p className="text-sm text-muted-foreground">Total usage today</p>
            </CardContent>
          </Card>

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
                  {cryptoLoading ? (
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-muted rounded-full animate-pulse" />
                            <div className="space-y-1">
                              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                              <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-4 bg-muted rounded w-16 animate-pulse ml-auto" />
                            <div className="h-3 bg-muted rounded w-12 animate-pulse ml-auto" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : cryptoAssets.length > 0 ? (
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
                        {isConnected ? "No crypto data available" : "Connect to Home Assistant to view crypto data"}
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
      </main>
    </div>
  );
}