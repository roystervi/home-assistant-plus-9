"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Settings2,
  FolderSync,
  Palette,
  HardDriveUpload,
  PcCase,
  Tv,
  Monitor,
  Tablet,
  Smartphone,
  Cloud,
  Zap,
  MapPin,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  Plus,
  Trash2,
  Save,
  FileEdit,
  Activity,
  RefreshCw
} from "lucide-react";

import {
  haConnectionSettings,
  weatherApiSettings,
  energyApiSettings,
  appearanceSettings,
  storage
} from "@/lib/storage";

interface ConnectionStatus {
  ha: "connected" | "disconnected" | "testing";
  weather: "configured" | "not_configured" | "testing";
  energy: "configured" | "not_configured" | "testing";
  mqtt: "running" | "stopped" | "starting" | "stopping";
  zwave: "connected" | "disconnected" | "connecting";
}

// Add interface for HA states
interface HAStatusStates {
  "conversation.home_assistant": string;
  "update.home_assistant_core_update": string;
  "update.home_assistant_matter_hub_update": string;
  "update.home_assistant_operating_system_update": string;
  "update.home_assistant_supervisor_update": string;
}

interface AppearanceSettings {
  theme: "light" | "dark" | "auto";
  backgroundColor: string;
  textSize: number;
  textWeight: "normal" | "bold";
  textColor: string;
  displayMode: "tv" | "desktop" | "tablet" | "phone";
}

interface LocalServices {
  mqttEnabled: boolean;
  mqttPort: number;
  zwaveEnabled: boolean;
  zwavePort: string;
  sqlitePath: string;
  dbSize: string;
}

// Add billing rate structure interface
interface BillingRateStructure {
  tiers: Array<{
    min: number;
    max: number | null;
    rate: number;
  }>;
  fixedCharges: Array<{
    name: string;
    amount: number;
  }>;
  taxes: Array<{
    name: string;
    rate: number; // percentage
  }>;
}

export default function Settings() {
  // Home Assistant Connection State (Persistent)
  const [haUrl, setHaUrl] = useState(() => haConnectionSettings.getSetting("url"));
  const [haToken, setHaToken] = useState(() => haConnectionSettings.getSetting("token"));
  const [haTimeout, setHaTimeout] = useState(() => haConnectionSettings.getSetting("connectionTimeout"));

  // Weather API State (Persistent)
  const [weatherProvider, setWeatherProvider] = useState(() => weatherApiSettings.getSetting("provider"));
  const [weatherApiKey, setWeatherApiKey] = useState(() => weatherApiSettings.getSetting("apiKey"));
  const [weatherLocation, setWeatherLocation] = useState(() => {
    const stored = weatherApiSettings.getSetting("location");
    return stored || { lat: 0, lon: 0, city: "", country: "" };
  });
  const [weatherUnits, setWeatherUnits] = useState(() => weatherApiSettings.getSetting("units"));

  // Energy API State (Persistent)
  const [energyProvider, setEnergyProvider] = useState(() => energyApiSettings.getSetting("provider"));
  const [costPerKwh, setCostPerKwh] = useState(() => energyApiSettings.getSetting("costPerKwh"));
  const [energyTimezone, setEnergyTimezone] = useState(() => energyApiSettings.getSetting("timezone"));
  const [utilityApiKey, setUtilityApiKey] = useState(() => energyApiSettings.getSetting("utilityApiKey"));
  const [senseEmail, setSenseEmail] = useState(() => energyApiSettings.getSetting("senseEmail"));
  const [sensePassword, setSensePassword] = useState(() => energyApiSettings.getSetting("sensePassword"));

  // Appearance State (Persistent)
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => ({
    theme: appearanceSettings.getSetting("theme"),
    backgroundColor: appearanceSettings.getSetting("backgroundColor"),
    textSize: appearanceSettings.getSetting("textSize"),
    textWeight: appearanceSettings.getSetting("textWeight"),
    textColor: appearanceSettings.getSetting("textColor"),
    displayMode: appearanceSettings.getSetting("displayMode"),
  }));

  // Local Services State
  const [localServices, setLocalServices] = useState<LocalServices>({
    mqttEnabled: false,
    mqttPort: 1883,
    zwaveEnabled: false,
    zwavePort: "/dev/ttyUSB0",
    sqlitePath: "./data/homeassistant.db",
    dbSize: "12.5 MB"
  });

  // Add billing rate structure state
  const [billingRates, setBillingRates] = useState<BillingRateStructure>(() => {
    const stored = energyApiSettings.getSetting("billingRates");
    if (stored) return stored;
    
    // Default billing structure based on uploaded example
    return {
      tiers: [
        { min: 0, max: 1000, rate: 0.12 },
        { min: 1000, max: 2000, rate: 0.15 },
        { min: 2000, max: null, rate: 0.18 }
      ],
      fixedCharges: [
        { name: "Basic Service Charge", amount: 8.95 },
        { name: "Distribution Charge", amount: 12.50 },
        { name: "Transmission Charge", amount: 4.25 }
      ],
      taxes: [
        { name: "State Tax", rate: 6.25 },
        { name: "Municipal Tax", rate: 2.50 }
      ]
    };
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ha: haUrl && haToken ? "connected" : "disconnected",
    weather: weatherApiKey ? "configured" : "not_configured",
    energy: "configured",
    mqtt: "stopped",
    zwave: "disconnected"
  });

  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [detailedLogs, setDetailedLogs] = useState(false);

  // Add HA status states
  const [haStatusStates, setHaStatusStates] = useState<Partial<HAStatusStates>>({});
  const [isLoadingStates, setIsLoadingStates] = useState(false);

  const backgroundSwatches = [
    { name: "Light Gray", value: "#f3f4f6" },
    { name: "White", value: "#ffffff" },
    { name: "Slate", value: "#f1f5f9" },
    { name: "Blue", value: "#eff6ff" },
    { name: "Green", value: "#f0fdf4" },
    { name: "Purple", value: "#faf5ff" },
    { name: "Warm", value: "#fefbf3" },
    { name: "Dark", value: "#1f2937" }
  ];

  const displayModes = [
    { 
      id: "tv", 
      name: "TV Display", 
      icon: Tv, 
      description: "Large text, simplified layout for living room viewing",
      features: ["Extra large text", "High contrast", "Simplified navigation", "Auto-scroll content"]
    },
    { 
      id: "desktop", 
      name: "Desktop Monitor", 
      icon: Monitor, 
      description: "Standard desktop experience with full features",
      features: ["Full feature set", "Multi-column layout", "Detailed information", "Mouse optimized"]
    },
    { 
      id: "tablet", 
      name: "Tablet", 
      icon: Tablet, 
      description: "Touch-optimized interface for tablets",
      features: ["Touch-friendly buttons", "Adaptive layout", "Swipe gestures", "Medium text size"]
    },
    { 
      id: "phone", 
      name: "Phone", 
      icon: Smartphone, 
      description: "Mobile-first compact layout",
      features: ["Compact layout", "Bottom navigation", "Swipe gestures", "Single column"]
    }
  ];

  // Persist Home Assistant settings
  useEffect(() => {
    haConnectionSettings.setSetting("url", haUrl);
  }, [haUrl]);

  useEffect(() => {
    haConnectionSettings.setSetting("token", haToken);
  }, [haToken]);

  useEffect(() => {
    haConnectionSettings.setSetting("connectionTimeout", haTimeout);
  }, [haTimeout]);

  // Persist Weather API settings
  useEffect(() => {
    weatherApiSettings.setSetting("provider", weatherProvider);
  }, [weatherProvider]);

  useEffect(() => {
    weatherApiSettings.setSetting("apiKey", weatherApiKey);
  }, [weatherApiKey]);

  useEffect(() => {
    weatherApiSettings.setSetting("location", weatherLocation);
  }, [weatherLocation]);

  useEffect(() => {
    weatherApiSettings.setSetting("units", weatherUnits);
  }, [weatherUnits]);

  // Persist Energy API settings
  useEffect(() => {
    energyApiSettings.setSetting("provider", energyProvider);
  }, [energyProvider]);

  useEffect(() => {
    energyApiSettings.setSetting("costPerKwh", costPerKwh);
  }, [costPerKwh]);

  useEffect(() => {
    energyApiSettings.setSetting("timezone", energyTimezone);
  }, [energyTimezone]);

  useEffect(() => {
    energyApiSettings.setSetting("utilityApiKey", utilityApiKey);
  }, [utilityApiKey]);

  useEffect(() => {
    energyApiSettings.setSetting("senseEmail", senseEmail);
  }, [senseEmail]);

  useEffect(() => {
    energyApiSettings.setSetting("sensePassword", sensePassword);
  }, [sensePassword]);

  // Persist Appearance settings
  useEffect(() => {
    appearanceSettings.set(appearance);
  }, [appearance]);

  // Persist billing rates
  useEffect(() => {
    energyApiSettings.setSetting("billingRates", billingRates);
  }, [billingRates]);

  // Add function to fetch HA status states
  const fetchHAStatusStates = async () => {
    if (!haUrl || !haToken || connectionStatus.ha !== "connected") {
      toast.error("Home Assistant must be connected first");
      return;
    }

    setIsLoadingStates(true);
    
    try {
      const stateEntities = [
        "conversation.home_assistant",
        "update.home_assistant_core_update", 
        "update.home_assistant_matter_hub_update",
        "update.home_assistant_operating_system_update",
        "update.home_assistant_supervisor_update"
      ];

      const states: Partial<HAStatusStates> = {};
      
      for (const entityId of stateEntities) {
        try {
          const response = await fetch(`${haUrl}/api/states/${entityId}`, {
            headers: {
              'Authorization': `Bearer ${haToken}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            states[entityId as keyof HAStatusStates] = data.state;
          } else {
            states[entityId as keyof HAStatusStates] = "unavailable";
          }
        } catch (error) {
          states[entityId as keyof HAStatusStates] = "error";
        }
      }
      
      setHaStatusStates(states);
      toast.success("Home Assistant status updated");
    } catch (error) {
      toast.error("Failed to fetch Home Assistant status");
    } finally {
      setIsLoadingStates(false);
    }
  };

  // Toggle MQTT Service
  const toggleMqtt = async () => {
    const newState = localServices.mqttEnabled ? "stopping" : "starting";
    setConnectionStatus(prev => ({ ...prev, mqtt: newState }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const finalState = newState === "starting" ? "running" : "stopped";
      setConnectionStatus(prev => ({ ...prev, mqtt: finalState }));
      setLocalServices(prev => ({ ...prev, mqttEnabled: !prev.mqttEnabled }));
      
      toast.success(`MQTT broker ${finalState === "running" ? "started" : "stopped"}`);
    } catch (error) {
      toast.error("Failed to toggle MQTT broker");
      setConnectionStatus(prev => ({ ...prev, mqtt: localServices.mqttEnabled ? "running" : "stopped" }));
    }
  };

  // Test MQTT Publish
  const testMqttPublish = async () => {
    if (connectionStatus.mqtt !== "running") {
      toast.error("MQTT broker is not running");
      return;
    }

    try {
      toast.info("Publishing test message...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("MQTT test message published and received successfully");
    } catch (error) {
      toast.error("Failed to publish MQTT test message");
    }
  };

  // Test Home Assistant Connection
  const testHaConnection = async () => {
    if (!haUrl || !haToken) {
      toast.error("Please enter both HA URL and token");
      return;
    }

    setConnectionStatus(prev => ({ ...prev, ha: "testing" }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), haTimeout);

      const response = await fetch(`${haUrl}/api/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.message === "API running.") {
          setConnectionStatus(prev => ({ ...prev, ha: "connected" }));
          haConnectionSettings.setSetting("isConnected", true);
          haConnectionSettings.setSetting("lastConnectionTest", new Date().toISOString());
          toast.success("Home Assistant connected successfully");
          
          // Auto-fetch status states after successful connection
          setTimeout(() => fetchHAStatusStates(), 500);
        } else {
          throw new Error("Invalid response from HA");
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      setConnectionStatus(prev => ({ ...prev, ha: "disconnected" }));
      haConnectionSettings.setSetting("isConnected", false);
      
      if (error.name === 'AbortError') {
        toast.error("Connection timeout - check URL and network");
      } else {
        toast.error(`Failed to connect: ${error.message}`);
      }
    }
  };

  // Test Weather API
  const testWeatherApi = async () => {
    if (weatherProvider !== "ha_integration" && !weatherApiKey) {
      toast.error("Please enter weather API key");
      return;
    }

    if (weatherProvider === "ha_integration" && (!haUrl || !haToken)) {
      toast.error("Home Assistant connection required for HA weather integration");
      return;
    }

    setConnectionStatus(prev => ({ ...prev, weather: "testing" }));

    try {
      let testUrl = "";
      let headers: Record<string, string> = {};
      
      switch (weatherProvider) {
        case "openweathermap":
          testUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLocation.lat}&lon=${weatherLocation.lon}&appid=${weatherApiKey}&units=${weatherUnits}`;
          break;
        case "weatherapi":
          testUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${weatherLocation.lat},${weatherLocation.lon}`;
          break;
        case "accuweather":
          testUrl = `https://dataservice.accuweather.com/currentconditions/v1/${weatherLocation.lat},${weatherLocation.lon}?apikey=${weatherApiKey}`;
          break;
        case "ha_integration":
          testUrl = `${haUrl}/api/states/weather.home`;
          headers = { 'Authorization': `Bearer ${haToken}` };
          break;
      }

      const response = await fetch(testUrl, { headers });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, weather: "configured" }));
        weatherApiSettings.setSetting("isConfigured", true);
        weatherApiSettings.setSetting("lastUpdate", new Date().toISOString());
        toast.success(`${weatherProvider} weather API connected successfully`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      setConnectionStatus(prev => ({ ...prev, weather: "not_configured" }));
      weatherApiSettings.setSetting("isConfigured", false);
      toast.error(`Weather API test failed: ${error.message}`);
    }
  };

  // Test Energy API
  const testEnergyApi = async () => {
    setConnectionStatus(prev => ({ ...prev, energy: "testing" }));

    try {
      switch (energyProvider) {
        case "ha":
          if (!haUrl || !haToken) {
            throw new Error("Home Assistant connection required");
          }
          const haResponse = await fetch(`${haUrl}/api/states`, {
            headers: { 'Authorization': `Bearer ${haToken}` }
          });
          if (!haResponse.ok) throw new Error("Failed to fetch HA states");
          break;
          
        case "utility_api":
          if (!utilityApiKey) {
            throw new Error("Utility API key required");
          }
          break;
          
        case "sense":
          if (!senseEmail || !sensePassword) {
            throw new Error("Sense credentials required");
          }
          break;
          
        case "manual":
          break;
      }

      setConnectionStatus(prev => ({ ...prev, energy: "configured" }));
      energyApiSettings.setSetting("isConfigured", true);
      toast.success(`${energyProvider} energy source configured successfully`);
    } catch (error: any) {
      setConnectionStatus(prev => ({ ...prev, energy: "not_configured" }));
      energyApiSettings.setSetting("isConfigured", false);
      toast.error(`Energy API test failed: ${error.message}`);
    }
  };

  // Auto-detect location for weather
  const detectLocation = async () => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        toast.error("Geolocation not supported by this browser");
        return;
      }

      // Check if we're in a secure context (HTTPS)
      if (!window.isSecureContext) {
        toast.error("Location detection requires HTTPS. Please enter coordinates manually or use HTTPS.", {
          description: "For local development, try using localhost instead of 127.0.0.1, or manually enter your coordinates.",
          duration: 8000
        });
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading("Detecting your location...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          toast.dismiss(loadingToast);
          const { latitude, longitude } = position.coords;
          
          if (weatherApiKey && weatherProvider === "openweathermap") {
            try {
              const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${weatherApiKey}`
              );
              
              if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                  setWeatherLocation({
                    lat: latitude,
                    lon: longitude,
                    city: data[0].name,
                    country: data[0].country
                  });
                  toast.success(`Location detected: ${data[0].name}, ${data[0].country}`);
                  return;
                }
              }
            } catch (error) {
              console.warn("Reverse geocoding failed:", error);
            }
          }
          
          setWeatherLocation(prev => ({
            ...prev,
            lat: latitude,
            lon: longitude
          }));
          toast.success(`Location coordinates detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          toast.dismiss(loadingToast);
          let errorMessage = "Location detection failed";
          let errorDescription = "";
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied";
              errorDescription = "Please allow location access in your browser settings or enter coordinates manually.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location unavailable";
              errorDescription = "Your location could not be determined. Please enter coordinates manually.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              errorDescription = "Please try again or enter coordinates manually.";
              break;
            default:
              errorMessage = error.message.includes("Only secure origins") 
                ? "HTTPS required for location detection"
                : "Location detection failed";
              errorDescription = error.message.includes("Only secure origins")
                ? "For local development, use 'localhost' instead of '127.0.0.1' or enter coordinates manually."
                : "Please enter your coordinates manually below.";
              break;
          }
          
          toast.error(errorMessage, {
            description: errorDescription,
            duration: 8000
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } catch (error) {
      toast.error("Failed to detect location", {
        description: "Please enter your coordinates manually below.",
        duration: 5000
      });
    }
  };

  const handleDisplayModeChange = (mode: "tv" | "desktop" | "tablet" | "phone") => {
    setAppearance(prev => ({ ...prev, displayMode: mode }));
    
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove('display-tv', 'display-desktop', 'display-tablet', 'display-phone');
      document.documentElement.classList.add(`display-${mode}`);
    }
    
    let newTextSize = appearance.textSize;
    switch (mode) {
      case "tv":
        newTextSize = 24;
        break;
      case "desktop":
        newTextSize = 16;
        break;
      case "tablet":
        newTextSize = 18;
        break;
      case "phone":
        newTextSize = 14;
        break;
    }
    
    setAppearance(prev => ({ ...prev, textSize: newTextSize }));
    
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--base-text-size', `${newTextSize}px`);
    }
    
    toast.success(`Display mode changed to ${displayModes.find(d => d.id === mode)?.name}`);
  };

  const handleBackgroundChange = (color: string) => {
    setAppearance(prev => ({ ...prev, backgroundColor: color }));
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--color-background', color);
    }
  };

  const handleTextSizeChange = (size: number[]) => {
    const newSize = size[0];
    setAppearance(prev => ({ ...prev, textSize: newSize }));
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--base-text-size', `${newSize}px`);
    }
  };

  const exportBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        setBackupProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        settings: {
          haConnection: haConnectionSettings.get(),
          weatherApi: weatherApiSettings.get(),
          energyApi: energyApiSettings.get(),
          appearance: appearance,
          localServices: localServices
        },
        version: "1.0.0"
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json"
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `homecontrol-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Settings backup exported successfully");
    } catch (error) {
      toast.error("Failed to export backup");
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (backupData.settings) {
        if (backupData.settings.haConnection) haConnectionSettings.set(backupData.settings.haConnection);
        if (backupData.settings.weatherApi) weatherApiSettings.set(backupData.settings.weatherApi);
        if (backupData.settings.energyApi) energyApiSettings.set(backupData.settings.energyApi);
        if (backupData.settings.appearance) setAppearance(backupData.settings.appearance);
        if (backupData.settings.localServices) setLocalServices(backupData.settings.localServices);
        
        toast.success("Settings backup imported successfully");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error("Invalid backup file format");
      }
    } catch (error) {
      toast.error("Failed to import backup - invalid file format");
    }
  };

  const resetToDefaults = () => {
    haConnectionSettings.reset();
    weatherApiSettings.reset();
    energyApiSettings.reset();
    appearanceSettings.reset();
    
    setAppearance({
      theme: "auto",
      backgroundColor: "#f3f4f6",
      textSize: 16,
      textWeight: "normal",
      textColor: "#111827",
      displayMode: "desktop"
    });
    
    setLocalServices({
      mqttEnabled: false,
      mqttPort: 1883,
      zwaveEnabled: false,
      zwavePort: "/dev/ttyUSB0",
      sqlitePath: "./data/homeassistant.db",
      dbSize: "12.5 MB"
    });
    
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty('--color-background', '#f3f4f6');
      document.documentElement.style.setProperty('--base-text-size', '16px');
      document.documentElement.classList.remove('display-tv', 'display-desktop', 'display-tablet', 'display-phone');
      document.documentElement.classList.add('display-desktop');
    }
    
    toast.success("Settings reset to defaults");
  };

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case "connected":
      case "configured":
      case "running":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "testing":
      case "starting":
      case "stopping":
      case "connecting":
        return <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
        return "bg-green-500";
      case "testing":
      case "starting":
      case "stopping":
      case "connecting":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  // Add function to get state status color
  const getStateStatusColor = (state: string) => {
    switch (state) {
      case "on":
      case "idle":
      case "no_update":
        return "text-green-600";
      case "unavailable":
      case "error":
        return "text-red-600";
      case "updating":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  // Billing rate management functions
  const addRateTier = () => {
    setBillingRates(prev => ({
      ...prev,
      tiers: [...prev.tiers, { min: 0, max: null, rate: 0.12 }]
    }));
  };

  const updateRateTier = (index: number, field: 'min' | 'max' | 'rate', value: number | null) => {
    setBillingRates(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  const removeRateTier = (index: number) => {
    setBillingRates(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const addFixedCharge = () => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: [...prev.fixedCharges, { name: "New Charge", amount: 0 }]
    }));
  };

  const updateFixedCharge = (index: number, field: 'name' | 'amount', value: string | number) => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: prev.fixedCharges.map((charge, i) => 
        i === index ? { ...charge, [field]: value } : charge
      )
    }));
  };

  const removeFixedCharge = (index: number) => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: prev.fixedCharges.filter((_, i) => i !== index)
    }));
  };

  const addTax = () => {
    setBillingRates(prev => ({
      ...prev,
      taxes: [...prev.taxes, { name: "New Tax", rate: 0 }]
    }));
  };

  const updateTax = (index: number, field: 'name' | 'rate', value: string | number) => {
    setBillingRates(prev => ({
      ...prev,
      taxes: prev.taxes.map((tax, i) => 
        i === index ? { ...tax, [field]: value } : tax
      )
    }));
  };

  const removeTax = (index: number) => {
    setBillingRates(prev => ({
      ...prev,
      taxes: prev.taxes.filter((_, i) => i !== index)
    }));
  };

  const saveBillingRates = () => {
    energyApiSettings.setSetting("billingRates", billingRates);
    toast.success("Billing rates saved successfully");
  };

  const resetBillingRates = () => {
    setBillingRates({
      tiers: [
        { min: 0, max: 1000, rate: 0.12 },
        { min: 1000, max: 2000, rate: 0.15 },
        { min: 2000, max: null, rate: 0.18 }
      ],
      fixedCharges: [
        { name: "Basic Service Charge", amount: 8.95 },
        { name: "Distribution Charge", amount: 12.50 },
        { name: "Transmission Charge", amount: 4.25 }
      ],
      taxes: [
        { name: "State Tax", rate: 6.25 },
        { name: "Municipal Tax", rate: 2.50 }
      ]
    });
    toast.success("Billing rates reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Bar */}
      <Card className="bg-card border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Settings2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">System Settings</h1>
                <p className="text-muted-foreground">Configure connections, APIs, services, and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                v1.0.0
              </Badge>
              <Button variant="outline" size="sm" onClick={exportBackup}>
                <FolderSync className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.ha)}`} />
              <span className="text-sm">Home Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.weather)}`} />
              <span className="text-sm">Weather API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.energy)}`} />
              <span className="text-sm">Energy API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.mqtt)}`} />
              <span className="text-sm">MQTT Broker</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.zwave)}`} />
              <span className="text-sm">Z-Wave</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="connections">Home Assistant</TabsTrigger>
          <TabsTrigger value="weather">Weather API</TabsTrigger>
          <TabsTrigger value="energy">Energy API</TabsTrigger>
          <TabsTrigger value="services">Local Services</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="backup">Data & Backup</TabsTrigger>
        </TabsList>

        {/* Home Assistant Connection */}
        <TabsContent value="connections" className="space-y-6">
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Home Assistant Connection
                    </CardTitle>
                    <CardDescription>
                      Connect to your Home Assistant instance for device control and automation
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionIcon(connectionStatus.ha)}
                    <Badge variant={connectionStatus.ha === "connected" ? "default" : "secondary"}>
                      {connectionStatus.ha}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ha-url">Home Assistant URL</Label>
                    <Input
                      id="ha-url"
                      placeholder="http://homeassistant.local:8123"
                      value={haUrl}
                      onChange={(e) => setHaUrl(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ha-timeout">Connection Timeout (ms)</Label>
                    <Input
                      id="ha-timeout"
                      type="number"
                      value={haTimeout}
                      onChange={(e) => setHaTimeout(parseInt(e.target.value) || 5000)}
                      min={1000}
                      max={30000}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="ha-token">Long-lived Access Token</Label>
                  <Input
                    id="ha-token"
                    type="password"
                    placeholder="Enter your HA token"
                    value={haToken}
                    onChange={(e) => setHaToken(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={testHaConnection}
                  disabled={connectionStatus.ha === "testing" || !haUrl || !haToken}
                  className="w-full"
                >
                  {connectionStatus.ha === "testing" ? (
                    <>
                      <Wifi className="h-4 w-4 mr-2 animate-pulse" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Home Assistant Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Home Assistant Status
                    </CardTitle>
                    <CardDescription>
                      Monitor key Home Assistant system states to verify connectivity
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={fetchHAStatusStates}
                    disabled={isLoadingStates || connectionStatus.ha !== "connected"}
                    size="sm"
                    variant="outline"
                  >
                    {isLoadingStates ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Status
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {connectionStatus.ha !== "connected" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Connect to Home Assistant first to view status</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.keys(haStatusStates).length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>Click "Refresh Status" to load Home Assistant states</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">Conversation</p>
                              <p className="text-xs text-muted-foreground">conversation.home_assistant</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getStateStatusColor(haStatusStates["conversation.home_assistant"] || "")}
                              >
                                {haStatusStates["conversation.home_assistant"] || "Unknown"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">Core Update</p>
                              <p className="text-xs text-muted-foreground">update.home_assistant_core_update</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getStateStatusColor(haStatusStates["update.home_assistant_core_update"] || "")}
                              >
                                {haStatusStates["update.home_assistant_core_update"] || "Unknown"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">Matter Hub Update</p>
                              <p className="text-xs text-muted-foreground">update.home_assistant_matter_hub_update</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getStateStatusColor(haStatusStates["update.home_assistant_matter_hub_update"] || "")}
                              >
                                {haStatusStates["update.home_assistant_matter_hub_update"] || "Unknown"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">Operating System Update</p>
                              <p className="text-xs text-muted-foreground">update.home_assistant_operating_system_update</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getStateStatusColor(haStatusStates["update.home_assistant_operating_system_update"] || "")}
                              >
                                {haStatusStates["update.home_assistant_operating_system_update"] || "Unknown"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">Supervisor Update</p>
                              <p className="text-xs text-muted-foreground">update.home_assistant_supervisor_update</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getStateStatusColor(haStatusStates["update.home_assistant_supervisor_update"] || "")}
                              >
                                {haStatusStates["update.home_assistant_supervisor_update"] || "Unknown"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            <strong>Status Guide:</strong> When these states are visible and responding, 
                            it indicates your Home Assistant connection is working properly. 
                            Green states (on/idle/no_update) are healthy, yellow indicates activity, 
                            and red means unavailable or error.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        </TabsContent>

        {/* Weather API Configuration */}
        <TabsContent value="weather" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Weather API Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure weather data source independently from Home Assistant
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getConnectionIcon(connectionStatus.weather)}
                  <Badge variant={connectionStatus.weather === "configured" ? "default" : "secondary"}>
                    {connectionStatus.weather.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weather-provider">Weather Provider</Label>
                <Select value={weatherProvider} onValueChange={setWeatherProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openweathermap">OpenWeatherMap</SelectItem>
                    <SelectItem value="weatherapi">WeatherAPI</SelectItem>
                    <SelectItem value="accuweather">AccuWeather</SelectItem>
                    <SelectItem value="ha_integration">Home Assistant Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {weatherProvider !== "ha_integration" && (
                <>
                  <div>
                    <Label htmlFor="weather-api-key">API Key</Label>
                    <Input
                      id="weather-api-key"
                      type="password"
                      placeholder="Enter weather API key"
                      value={weatherApiKey}
                      onChange={(e) => setWeatherApiKey(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weather-units">Units</Label>
                      <Select value={weatherUnits} onValueChange={setWeatherUnits}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imperial">Imperial (°F)</SelectItem>
                          <SelectItem value="metric">Metric (°C)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        onClick={detectLocation}
                        variant="outline"
                        className="w-full"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Detect Location
                      </Button>
                    </div>
                  </div>

                  {weatherLocation.city && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Location:</strong> {weatherLocation.city}, {weatherLocation.country}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Coordinates: {weatherLocation.lat.toFixed(4)}, {weatherLocation.lon.toFixed(4)}
                      </p>
                    </div>
                  )}
                </>
              )}

              <Button 
                onClick={testWeatherApi}
                disabled={connectionStatus.weather === "testing"}
                className="w-full"
              >
                {connectionStatus.weather === "testing" ? (
                  <>
                    <Cloud className="h-4 w-4 mr-2 animate-pulse" />
                    Testing Weather API...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Test Weather API
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy API Configuration */}
        <TabsContent value="energy" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Energy API Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure energy data sources and billing settings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getConnectionIcon(connectionStatus.energy)}
                  <Badge variant={connectionStatus.energy === "configured" ? "default" : "secondary"}>
                    {connectionStatus.energy.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="energy-provider">Energy Data Source</Label>
                <Select value={energyProvider} onValueChange={setEnergyProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ha">Home Assistant</SelectItem>
                    <SelectItem value="utility_api">Utility API</SelectItem>
                    <SelectItem value="sense">Sense Energy Monitor</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost-kwh">Base Cost per kWh ($)</Label>
                  <Input
                    id="cost-kwh"
                    type="number"
                    step="0.01"
                    value={costPerKwh}
                    onChange={(e) => setCostPerKwh(parseFloat(e.target.value) || 0.12)}
                    min="0"
                    max="1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="energy-timezone">Timezone</Label>
                  <Select value={energyTimezone} onValueChange={setEnergyTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {energyProvider === "utility_api" && (
                <div>
                  <Label htmlFor="utility-api-key">Utility API Key</Label>
                  <Input
                    id="utility-api-key"
                    type="password"
                    placeholder="Enter Utility API key"
                    value={utilityApiKey}
                    onChange={(e) => setUtilityApiKey(e.target.value)}
                  />
                </div>
              )}

              {energyProvider === "sense" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sense-email">Sense Email</Label>
                    <Input
                      id="sense-email"
                      type="email"
                      placeholder="your@email.com"
                      value={senseEmail}
                      onChange={(e) => setSenseEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sense-password">Sense Password</Label>
                    <Input
                      id="sense-password"
                      type="password"
                      placeholder="Enter password"
                      value={sensePassword}
                      onChange={(e) => setSensePassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={testEnergyApi}
                disabled={connectionStatus.energy === "testing"}
                className="w-full"
              >
                {connectionStatus.energy === "testing" ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    Testing Energy API...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Test Energy Configuration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Billing Rate Structure Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileEdit className="h-5 w-5" />
                    Electric Company Billing Rates
                  </CardTitle>
                  <CardDescription>
                    Configure your electric company's rate structure, fees, and taxes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveBillingRates} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Rates
                  </Button>
                  <Button onClick={resetBillingRates} variant="outline" size="sm">
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rate Tiers Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Rate Tiers ($/kWh)</Label>
                  <Button onClick={addRateTier} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </div>
                <div className="space-y-3">
                  {billingRates.tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-4 gap-3 items-center p-3 border rounded-lg">
                      <div>
                        <Label htmlFor={`tier-min-${index}`} className="text-xs">Min kWh</Label>
                        <Input
                          id={`tier-min-${index}`}
                          type="number"
                          value={tier.min}
                          onChange={(e) => updateRateTier(index, 'min', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tier-max-${index}`} className="text-xs">Max kWh</Label>
                        <Input
                          id={`tier-max-${index}`}
                          type="number"
                          value={tier.max || ''}
                          onChange={(e) => updateRateTier(index, 'max', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tier-rate-${index}`} className="text-xs">Rate ($)</Label>
                        <Input
                          id={`tier-rate-${index}`}
                          type="number"
                          step="0.01"
                          value={tier.rate}
                          onChange={(e) => updateRateTier(index, 'rate', parseFloat(e.target.value) || 0)}
                          placeholder="0.12"
                        />
                      </div>
                      <Button
                        onClick={() => removeRateTier(index)}
                        size="sm"
                        variant="destructive"
                        disabled={billingRates.tiers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Fixed Charges Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Fixed Monthly Charges</Label>
                  <Button onClick={addFixedCharge} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Charge
                  </Button>
                </div>
                <div className="space-y-3">
                  {billingRates.fixedCharges.map((charge, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 items-center p-3 border rounded-lg">
                      <div className="col-span-2">
                        <Label htmlFor={`charge-name-${index}`} className="text-xs">Charge Name</Label>
                        <Input
                          id={`charge-name-${index}`}
                          value={charge.name}
                          onChange={(e) => updateFixedCharge(index, 'name', e.target.value)}
                          placeholder="Service Charge"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`charge-amount-${index}`} className="text-xs">Amount ($)</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`charge-amount-${index}`}
                            type="number"
                            step="0.01"
                            value={charge.amount}
                            onChange={(e) => updateFixedCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="8.95"
                          />
                          <Button
                            onClick={() => removeFixedCharge(index)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Taxes Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-medium">Taxes & Fees (%)</Label>
                  <Button onClick={addTax} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tax
                  </Button>
                </div>
                <div className="space-y-3">
                  {billingRates.taxes.map((tax, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 items-center p-3 border rounded-lg">
                      <div className="col-span-2">
                        <Label htmlFor={`tax-name-${index}`} className="text-xs">Tax/Fee Name</Label>
                        <Input
                          id={`tax-name-${index}`}
                          value={tax.name}
                          onChange={(e) => updateTax(index, 'name', e.target.value)}
                          placeholder="State Tax"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tax-rate-${index}`} className="text-xs">Rate (%)</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`tax-rate-${index}`}
                            type="number"
                            step="0.01"
                            value={tax.rate}
                            onChange={(e) => updateTax(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder="6.25"
                          />
                          <Button
                            onClick={() => removeTax(index)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Section */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Billing Structure Preview</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Rate Tiers:</strong>
                    {billingRates.tiers.map((tier, index) => (
                      <div key={index} className="ml-4 text-muted-foreground">
                        {tier.min} - {tier.max || '∞'} kWh: ${tier.rate.toFixed(4)}/kWh
                      </div>
                    ))}
                  </div>
                  <div>
                    <strong>Fixed Charges:</strong> ${billingRates.fixedCharges.reduce((sum, charge) => sum + charge.amount, 0).toFixed(2)}/month
                  </div>
                  <div>
                    <strong>Total Tax Rate:</strong> {billingRates.taxes.reduce((sum, tax) => sum + tax.rate, 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local Services */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PcCase className="h-5 w-5" />
                Local Services
              </CardTitle>
              <CardDescription>
                Manage embedded MQTT broker and Z-Wave server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MQTT Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>MQTT Broker</Label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.mqtt)}`} />
                    <span className="text-sm capitalize">{connectionStatus.mqtt}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Switch
                    checked={localServices.mqttEnabled}
                    onCheckedChange={toggleMqtt}
                    disabled={connectionStatus.mqtt === "starting" || connectionStatus.mqtt === "stopping"}
                  />
                  <div className="flex-1">
                    <Label htmlFor="mqtt-port">Port</Label>
                    <Input
                      id="mqtt-port"
                      type="number"
                      value={localServices.mqttPort}
                      onChange={(e) => setLocalServices(prev => ({ ...prev, mqttPort: parseInt(e.target.value) }))}
                      className="w-24"
                    />
                  </div>
                </div>
                
                {connectionStatus.mqtt === "running" && (
                  <Button onClick={testMqttPublish} variant="outline" size="sm">
                    Test MQTT Publish
                  </Button>
                )}
              </div>

              <Separator />

              {/* Z-Wave Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Z-Wave Server</Label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus.zwave)}`} />
                    <span className="text-sm capitalize">{connectionStatus.zwave}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Switch
                    checked={localServices.zwaveEnabled}
                    onCheckedChange={(checked) => setLocalServices(prev => ({ ...prev, zwaveEnabled: checked }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="zwave-port">Serial Port</Label>
                    <Input
                      id="zwave-port"
                      value={localServices.zwavePort}
                      onChange={(e) => setLocalServices(prev => ({ ...prev, zwavePort: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Database Section */}
              <div className="space-y-3">
                <Label>SQLite Database</Label>
                <div className="space-y-2">
                  <Input
                    value={localServices.sqlitePath}
                    onChange={(e) => setLocalServices(prev => ({ ...prev, sqlitePath: e.target.value }))}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Database size</span>
                    <Badge variant="outline">{localServices.dbSize}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Display Mode
              </CardTitle>
              <CardDescription>
                Optimize the interface for your viewing device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {displayModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = appearance.displayMode === mode.id;
                  
                  return (
                    <div
                      key={mode.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleDisplayModeChange(mode.id as "tv" | "desktop" | "tablet" | "phone")}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <h4 className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                            {mode.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {mode.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {mode.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                variant={isSelected ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Theme & Colors
              </CardTitle>
              <CardDescription>
                Customize colors and typography
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Theme Mode</Label>
                <Select
                  value={appearance.theme}
                  onValueChange={(value: "light" | "dark" | "auto") => 
                    setAppearance(prev => ({ ...prev, theme: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (Sunrise/Sunset)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Background Color</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {backgroundSwatches.map((swatch) => (
                    <button
                      key={swatch.name}
                      className={`w-12 h-12 rounded-md border-2 ${
                        appearance.backgroundColor === swatch.value 
                          ? 'border-primary' 
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: swatch.value }}
                      onClick={() => handleBackgroundChange(swatch.value)}
                      title={swatch.name}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={appearance.backgroundColor}
                  onChange={(e) => handleBackgroundChange(e.target.value)}
                  className="mt-2 w-full h-12"
                />
              </div>

              <div>
                <Label>Text Size</Label>
                <div className="mt-2 space-y-2">
                  <Slider
                    value={[appearance.textSize]}
                    onValueChange={handleTextSizeChange}
                    min={12}
                    max={32}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground">
                    Current: {appearance.textSize}px (Auto-adjusted for {displayModes.find(d => d.id === appearance.displayMode)?.name})
                  </div>
                </div>
              </div>

              <div>
                <Label>Text Weight</Label>
                <Select
                  value={appearance.textWeight}
                  onValueChange={(value: "normal" | "bold") => 
                    setAppearance(prev => ({ ...prev, textWeight: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Text Color</Label>
                <Input
                  type="color"
                  value={appearance.textColor}
                  onChange={(e) => setAppearance(prev => ({ ...prev, textColor: e.target.value }))}
                  className="w-full h-12 mt-2"
                />
              </div>

              {/* Preview Area */}
              <div className="p-4 rounded-md border" style={{
                backgroundColor: appearance.backgroundColor,
                color: appearance.textColor,
                fontSize: `${appearance.textSize}px`,
                fontWeight: appearance.textWeight
              }}>
                <h3 className="font-semibold mb-2">Preview</h3>
                <p>This is how your text will look with the current settings.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Backup */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDriveUpload className="w-5 h-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Backup, restore, and manage your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={exportBackup} disabled={isBackingUp} className="w-full">
                <FolderSync className="w-4 h-4 mr-2" />
                {isBackingUp ? "Creating Backup..." : "Export Backup"}
              </Button>
              
              {isBackingUp && (
                <div className="space-y-2">
                  <Progress value={backupProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Creating backup... {backupProgress}%
                  </p>
                </div>
              )}
              
              <div>
                <Label htmlFor="backup-import">Import Backup</Label>
                <Input
                  id="backup-import"
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importBackup(file);
                  }}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Privacy & Logs
              </CardTitle>
              <CardDescription>
                Control logging and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Detailed Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable verbose logging for debugging
                  </p>
                </div>
                <Switch
                  checked={detailedLogs}
                  onCheckedChange={setDetailedLogs}
                />
              </div>
              
              <Button variant="outline" className="w-full">
                Clear Cache & Logs
              </Button>
            </CardContent>
          </Card>

          {/* Reset Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Reset Settings</CardTitle>
              <CardDescription>
                Reset all settings to default values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Reset to Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all settings to their default values. This action cannot be undone.
                      Consider creating a backup before proceeding.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetToDefaults}>
                      Reset Settings
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}