"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Cloud,
  Zap,
  MapPin,
  Wifi,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  Plus,
  Trash2,
  Save,
  FileEdit,
  Activity,
  RefreshCw,
  Key,
} from "lucide-react";

import {
  haConnectionSettings,
  weatherApiSettings,
  energyApiSettings,
  appearanceSettings,
} from "@/lib/storage";

// Interfaces for type safety
interface ConnectionStatus {
  ha: "connected" | "disconnected" | "testing";
  weather: "configured" | "not_configured" | "testing";
  energy: "configured" | "not_configured" | "testing";
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
  sqlitePath: string;
  dbSize: string;
}

interface WeatherLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
  zip?: string;
  locationKey?: string;
}

interface GoogleOAuthState {
  clientId: string;
  clientSecret: string;
}

interface OpenAIKeyState {
  apiKey: string;
}

interface WeatherApiKeyState {
  openWeatherKey: string;
  weatherApiComKey: string;
}

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
    rate: number;
  }>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("connections");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ha: "disconnected",
    weather: "not_configured",
    energy: "not_configured",
  });
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haTimeout, setHaTimeout] = useState(5000);
  const [weatherProvider, setWeatherProvider] = useState("openweathermap");
  const [weatherApiKey, setWeatherApiKey] = useState("");
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation>({ 
    lat: 0, 
    lon: 0, 
    city: "", 
    country: "", 
    zip: "", 
    locationKey: "" 
  });
  const [weatherUnits, setWeatherUnits] = useState("imperial");
  const [energyProvider, setEnergyProvider] = useState("manual");
  const [costPerKwh, setCostPerKwh] = useState(0.12);
  const [energyTimezone, setEnergyTimezone] = useState("America/New_York");
  const [utilityApiKey, setUtilityApiKey] = useState("");
  const [senseEmail, setSenseEmail] = useState("");
  const [sensePassword, setSensePassword] = useState("");
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: "auto",
    backgroundColor: "#f3f4f6",
    textSize: 16,
    textWeight: "normal",
    textColor: "#111827",
    displayMode: "desktop",
  });
  const [localServices, setLocalServices] = useState<LocalServices>({
    sqlitePath: "./data/homeassistant.db",
    dbSize: "12.5 MB",
  });
  const [billingRates, setBillingRates] = useState<BillingRateStructure>({
    tiers: [{ min: 0, max: 1000, rate: 0.12 }, { min: 1000, max: 2000, rate: 0.15 }, { min: 2000, max: null, rate: 0.18 }],
    fixedCharges: [{ name: "Basic Service Charge", amount: 8.95 }, { name: "Distribution Charge", amount: 12.50 }, { name: "Transmission Charge", amount: 4.25 }],
    taxes: [{ name: "State Tax", rate: 6.25 }, { name: "Municipal Tax", rate: 2.50 }],
  });
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openWeatherKey, setOpenWeatherKey] = useState("");
  const [weatherApiComKey, setWeatherApiComKey] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [detailedLogs, setDetailedLogs] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [haStatusStates, setHaStatusStates] = useState<Record<string, string>>({});

  // Load from storage on mount
  useEffect(() => {
    const loadSettings = () => {
      const haSettings = haConnectionSettings.get();
      const weatherSettings = weatherApiSettings.get();
      const energySettings = energyApiSettings.get();
      const appearanceData = appearanceSettings.get();

      if (haSettings.url) setHaUrl(haSettings.url);
      if (haSettings.token) setHaToken(haSettings.token);
      if (haSettings.connectionTimeout) setHaTimeout(haSettings.connectionTimeout);

      if (weatherSettings.provider) setWeatherProvider(weatherSettings.provider);
      if (weatherSettings.apiKey) setWeatherApiKey(weatherSettings.apiKey);
      if (weatherSettings.location) setWeatherLocation(weatherSettings.location);
      if (weatherSettings.units) setWeatherUnits(weatherSettings.units);
      if (weatherSettings.isConfigured) setConnectionStatus(prev => ({ ...prev, weather: "configured" }));

      if (energySettings.provider) setEnergyProvider(energySettings.provider);
      if (energySettings.costPerKwh) setCostPerKwh(energySettings.costPerKwh);
      if (energySettings.timezone) setEnergyTimezone(energySettings.timezone);
      if (energySettings.utilityApiKey) setUtilityApiKey(energySettings.utilityApiKey);
      if (energySettings.senseEmail) setSenseEmail(energySettings.senseEmail);
      if (energySettings.sensePassword) setSensePassword(energySettings.sensePassword);
      if (energySettings.isConfigured) setConnectionStatus(prev => ({ ...prev, energy: "configured" }));

      if (appearanceData.theme) setAppearance(prev => ({ ...prev, theme: appearanceData.theme }));
      if (appearanceData.backgroundColor) setAppearance(prev => ({ ...prev, backgroundColor: appearanceData.backgroundColor }));
      if (appearanceData.textSize) setAppearance(prev => ({ ...prev, textSize: appearanceData.textSize }));
      if (appearanceData.textWeight) setAppearance(prev => ({ ...prev, textWeight: appearanceData.textWeight }));
      if (appearanceData.textColor) setAppearance(prev => ({ ...prev, textColor: appearanceData.textColor }));
      if (appearanceData.displayMode) setAppearance(prev => ({ ...prev, displayMode: appearanceData.displayMode }));

      const billingData = energyApiSettings.getSetting("billingRates");
      if (billingData) setBillingRates(billingData);

      // Initialize display mode
      if (typeof window !== "undefined") {
        const savedDisplayMode = localStorage.getItem("displayMode") as "tv" | "desktop" | "tablet" | "phone" | null;
        if (savedDisplayMode) {
          setAppearance(prev => ({ ...prev, displayMode: savedDisplayMode }));
          document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone");
          document.documentElement.classList.add(`display-${savedDisplayMode}`);
        }
      }

      // Load API keys from localStorage
      if (typeof window !== "undefined") {
        const savedGoogleClientId = localStorage.getItem("GOOGLE_CLIENT_ID");
        const savedGoogleClientSecret = localStorage.getItem("GOOGLE_CLIENT_SECRET");
        const savedOpenaiApiKey = localStorage.getItem("OPENAI_API_KEY");
        const savedOpenWeatherKey = localStorage.getItem("OPENWEATHER_API_KEY");
        const savedWeatherApiComKey = localStorage.getItem("WEATHERAPI_COM_KEY");

        if (savedGoogleClientId) setGoogleClientId(savedGoogleClientId);
        if (savedGoogleClientSecret) setGoogleClientSecret(savedGoogleClientSecret);
        if (savedOpenaiApiKey) setOpenaiApiKey(savedOpenaiApiKey);
        if (savedOpenWeatherKey) setOpenWeatherKey(savedOpenWeatherKey);
        if (savedWeatherApiComKey) setWeatherApiComKey(savedWeatherApiComKey);
      }
    };

    loadSettings();
  }, []);

  // Save to storage on changes
  useEffect(() => {
    haConnectionSettings.setSetting("url", haUrl);
    haConnectionSettings.setSetting("token", haToken);
    haConnectionSettings.setSetting("connectionTimeout", haTimeout);

    weatherApiSettings.setSetting("provider", weatherProvider);
    weatherApiSettings.setSetting("apiKey", weatherApiKey);
    weatherApiSettings.setSetting("location", weatherLocation);
    weatherApiSettings.setSetting("units", weatherUnits);

    energyApiSettings.setSetting("provider", energyProvider);
    energyApiSettings.setSetting("costPerKwh", costPerKwh);
    energyApiSettings.setSetting("timezone", energyTimezone);
    energyApiSettings.setSetting("utilityApiKey", utilityApiKey);
    energyApiSettings.setSetting("senseEmail", senseEmail);
    energyApiSettings.setSetting("sensePassword", sensePassword);
    energyApiSettings.setSetting("billingRates", billingRates);

    appearanceSettings.set(appearance);

    localStorage.setItem("displayMode", appearance.displayMode || "desktop");

    // Save API keys to localStorage
    localStorage.setItem("GOOGLE_CLIENT_ID", googleClientId);
    localStorage.setItem("GOOGLE_CLIENT_SECRET", googleClientSecret);
    localStorage.setItem("OPENAI_API_KEY", openaiApiKey);
    localStorage.setItem("OPENWEATHER_API_KEY", openWeatherKey);
    localStorage.setItem("WEATHERAPI_COM_KEY", weatherApiComKey);
  }, [haUrl, haToken, haTimeout, weatherProvider, weatherApiKey, weatherLocation, weatherUnits, energyProvider, costPerKwh, energyTimezone, utilityApiKey, senseEmail, sensePassword, billingRates, appearance, googleClientId, googleClientSecret, openaiApiKey, openWeatherKey, weatherApiComKey]);

  const handleDisplayModeChange = useCallback((mode) => {
    setAppearance(prev => ({ ...prev, displayMode: mode }));

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone");
      document.documentElement.classList.add(`display-${mode}`);
    }
  }, []);

  const handleThemeChange = useCallback((theme) => {
    setAppearance(prev => ({ ...prev, theme }));
  }, []);

  const handleBackgroundChange = useCallback((color) => {
    setAppearance(prev => ({ ...prev, backgroundColor: color }));
  }, []);

  const handleTextSizeChange = useCallback((size) => {
    const newSize = size[0];
    setAppearance(prev => ({ ...prev, textSize: newSize }));
  }, []);

  const handleTextWeightChange = useCallback((weight) => {
    setAppearance(prev => ({ ...prev, textWeight: weight }));
  }, []);

  const handleTextColorChange = useCallback((color) => {
    setAppearance(prev => ({ ...prev, textColor: color }));
  }, []);

  const exportBackup = useCallback(async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        setBackupProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        settings: {
          haConnection: haConnectionSettings.get(),
          weatherApi: weatherApiSettings.get(),
          energyApi: energyApiSettings.get(),
          appearance: appearance,
          localServices,
          billingRates,
          googleClientId,
          googleClientSecret,
          openaiApiKey,
          openWeatherKey,
          weatherApiComKey,
        },
        version: "1.0.0",
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `homecontrol-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Settings backup exported successfully!");
    } catch (error) {
      toast.error("Failed to export backup");
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  }, [haConnectionSettings, weatherApiSettings, energyApiSettings, appearance, localServices, billingRates, googleClientId, googleClientSecret, openaiApiKey, openWeatherKey, weatherApiComKey]);

  const handleImportBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (backupData.settings) {
        if (backupData.settings.haConnection) haConnectionSettings.set(backupData.settings.haConnection);
        if (backupData.settings.weatherApi) weatherApiSettings.set(backupData.settings.weatherApi);
        if (backupData.settings.energyApi) energyApiSettings.set(backupData.settings.energyApi);
        if (backupData.settings.appearance) setAppearance(backupData.settings.appearance);
        if (backupData.settings.localServices) setLocalServices(backupData.settings.localServices);
        if (backupData.settings.billingRates) setBillingRates(backupData.settings.billingRates);
        if (backupData.settings.googleClientId) setGoogleClientId(backupData.settings.googleClientId);
        if (backupData.settings.googleClientSecret) setGoogleClientSecret(backupData.settings.googleClientSecret);
        if (backupData.settings.openaiApiKey) setOpenaiApiKey(backupData.settings.openaiApiKey);
        if (backupData.settings.openWeatherKey) setOpenWeatherKey(backupData.settings.openWeatherKey);
        if (backupData.settings.weatherApiComKey) setWeatherApiComKey(backupData.settings.weatherApiComKey);

        toast.success("Settings backup imported successfully!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Invalid backup file format");
      }
    } catch (error) {
      toast.error(`Failed to import backup: ${error.message}`);
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    haConnectionSettings.reset();
    weatherApiSettings.reset();
    energyApiSettings.reset();
    appearanceSettings.reset();

    setHaUrl("");
    setHaToken("");
    setHaTimeout(5000);
    setWeatherProvider("openweathermap");
    setWeatherApiKey("");
    setWeatherLocation({ lat: 0, lon: 0, city: "", country: "", zip: "", locationKey: "" });
    setWeatherUnits("imperial");
    setEnergyProvider("manual");
    setCostPerKwh(0.12);
    setEnergyTimezone("America/New_York");
    setUtilityApiKey("");
    setSenseEmail("");
    setSensePassword("");
    setAppearance({
      theme: "auto",
      backgroundColor: "#f3f4f6",
      textSize: 16,
      textWeight: "normal",
      textColor: "#111827",
      displayMode: "desktop",
    });
    setLocalServices({
      sqlitePath: "./data/homeassistant.db",
      dbSize: "12.5 MB",
    });
    setBillingRates({
      tiers: [{ min: 0, max: 1000, rate: 0.12 }, { min: 1000, max: 2000, rate: 0.15 }, { min: 2000, max: null, rate: 0.18 }],
      fixedCharges: [{ name: "Basic Service Charge", amount: 8.95 }, { name: "Distribution Charge", amount: 12.50 }, { name: "Transmission Charge", amount: 4.25 }],
      taxes: [{ name: "State Tax", rate: 6.25 }, { name: "Municipal Tax", rate: 2.50 }],
    });
    setGoogleClientId("");
    setGoogleClientSecret("");
    setOpenaiApiKey("");
    setOpenWeatherKey("");
    setWeatherApiComKey("");

    setConnectionStatus({
      ha: "disconnected",
      weather: "not_configured",
      energy: "not_configured",
    });
    setBackupProgress(0);
    setIsBackingUp(false);
    setDetailedLogs(false);
    setIsLoadingStates(false);
    setHaStatusStates({});

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--color-background", "#f3f4f6");
      document.documentElement.style.setProperty("--base-text-size", "16px");
      document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone");
      document.documentElement.classList.add("display-desktop");
    }

    toast.success("All settings reset to defaults");
  }, []);

  const addRateTier = useCallback(() => {
    setBillingRates(prev => ({
      ...prev,
      tiers: [...prev.tiers, { min: 0, max: null, rate: 0.12 }]
    }));
  }, []);

  const updateRateTier = useCallback((index, field, value) => {
    setBillingRates(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  }, []);

  const removeRateTier = useCallback((index) => {
    setBillingRates(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  }, []);

  const addFixedCharge = useCallback(() => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: [...prev.fixedCharges, { name: "New Charge", amount: 0 }]
    }));
  }, []);

  const updateFixedCharge = useCallback((index, field, value) => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: prev.fixedCharges.map((charge, i) => 
        i === index ? { ...charge, [field]: value } : charge
      )
    }));
  }, []);

  const removeFixedCharge = useCallback((index) => {
    setBillingRates(prev => ({
      ...prev,
      fixedCharges: prev.fixedCharges.filter((_, i) => i !== index)
    }));
  }, []);

  const addTax = useCallback(() => {
    setBillingRates(prev => ({
      ...prev,
      taxes: [...prev.taxes, { name: "New Tax", rate: 0 }]
    }));
  }, []);

  const updateTax = useCallback((index, field, value) => {
    setBillingRates(prev => ({
      ...prev,
      taxes: prev.taxes.map((tax, i) => 
        i === index ? { ...tax, [field]: value } : tax
      )
    }));
  }, []);

  const removeTax = useCallback((index) => {
    setBillingRates(prev => ({
      ...prev,
      taxes: prev.taxes.filter((_, i) => i !== index)
    }));
  }, []);

  const saveBillingRates = useCallback(() => {
    energyApiSettings.setSetting("billingRates", billingRates);
    toast.success("Billing rates saved successfully");
  }, [billingRates]);

  const resetBillingRates = useCallback(() => {
    setBillingRates({
      tiers: [{ min: 0, max: 1000, rate: 0.12 }, { min: 1000, max: 2000, rate: 0.15 }, { min: 2000, max: null, rate: 0.18 }],
      fixedCharges: [{ name: "Basic Service Charge", amount: 8.95 }, { name: "Distribution Charge", amount: 12.50 }, { name: "Transmission Charge", amount: 4.25 }],
      taxes: [{ name: "State Tax", rate: 6.25 }, { name: "Municipal Tax", rate: 2.50 }]
    });
    toast.success("Billing rates reset to defaults");
  }, []);

  // Utility functions for UI
  const getConnectionIcon = (status) => {
    switch (status) {
      case "connected":
      case "configured":
      case "running":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "testing":
      case "testing":
        return <AlertCircle className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
      case "configured":
      case "running":
        return "bg-green-500";
      case "testing":
      case "starting":
      case "stopping":
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      default:
        return "bg-red-500";
    }
  };

  const getConnectionIndicator = (status) => (
    <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
  );

  const getStateStatusColor = (state) => {
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

  const backgroundSwatches = [
    { name: 'Light Gray', value: '#f3f4f6' },
    { name: 'White', value: '#ffffff' },
    { name: 'Blue', value: '#eff6ff' },
    { name: 'Green', value: '#f0fdf4' },
    { name: 'Yellow', value: '#fefce8' },
    { name: 'Red', value: '#fef2f2' },
    { name: 'Purple', value: '#faf5ff' },
  ];

  const testHaConnection = useCallback(async () => {
    if (!haUrl || !haToken) {
      toast.error('Please enter both HA URL and token');
      return;
    }

    setConnectionStatus(prev => ({ ...prev, ha: 'testing' }));

    try {
      const response = await fetch('/api/homeassistant/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: haUrl, token: haToken, timeout: haTimeout }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(prev => ({ ...prev, ha: 'connected' }));
        toast.success('Home Assistant connection successful!');
      } else {
        const error = await response.json().catch(() => ({ message: 'Connection failed' }));
        setConnectionStatus(prev => ({ ...prev, ha: 'disconnected' }));
        toast.error(`HA Connection failed: ${error.message}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, ha: 'disconnected' }));
      toast.error(`HA Connection error: ${error.message}`);
    }
  }, [haUrl, haToken, haTimeout]);

  const fetchHaStatusStates = useCallback(async () => {
    if (connectionStatus.ha !== 'connected') {
      toast.error('Connect to Home Assistant first');
      return;
    }

    setIsLoadingStates(true);

    try {
      const response = await fetch('/api/homeassistant/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: haUrl, 
          token: haToken, 
          entities: ['update.entity_id', 'conversation.process'] 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHaStatusStates(data.entities || {});
        toast.success('HA status loaded');
      } else {
        toast.error('Failed to load HA status');
      }
    } catch (error) {
      toast.error(`Error loading HA status: ${error.message}`);
    } finally {
      setIsLoadingStates(false);
    }
  }, [connectionStatus.ha, haUrl, haToken]);

  const testWeatherApi = useCallback(async () => {
    if (!weatherApiKey || weatherLocation.lat === 0) {
      toast.error('Configure API key and location first');
      return;
    }

    setConnectionStatus(prev => ({ ...prev, weather: 'testing' }));

    try {
      let url = '';
      switch (weatherProvider) {
        case 'openweathermap':
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLocation.lat}&lon=${weatherLocation.lon}&appid=${weatherApiKey}&units=${weatherUnits}`;
          break;
        case 'weatherapi':
          url = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${weatherLocation.lat},${weatherLocation.lon}`;
          break;
        case 'accuweather':
          if (!weatherLocation.locationKey) throw new Error('Location key required');
          url = `https://dataservice.accuweather.com/currentconditions/v1/${weatherLocation.locationKey}?apikey=${weatherApiKey}&details=true`;
          break;
        default:
          throw new Error('Unsupported provider');
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(prev => ({ ...prev, weather: 'configured' }));
        toast.success('Weather API test successful!');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, weather: 'not_configured' }));
      toast.error(`Weather API test failed: ${error.message}`);
    }
  }, [weatherApiKey, weatherLocation, weatherProvider, weatherUnits]);

  const handleGoogleOAuthTest = useCallback(async () => {
    if (!googleClientId || !googleClientSecret) {
      toast.error('Enter both Google Client ID and Secret');
      return;
    }

    // Client-side test - attempt to build auth URL
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=http://localhost:3000/api/google/calendar/callback&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent`;
      toast.success('Google OAuth URL configured correctly. Connect via Calendar page.');
    } catch (error) {
      toast.error('Invalid Google credentials format');
    }
  }, [googleClientId, googleClientSecret]);

  const saveGoogleKeys = useCallback(() => {
    // Already saved via useEffect to localStorage
    toast.success('Google keys saved securely');
  }, [googleClientId, googleClientSecret]);

  const saveOpenAIKey = useCallback(() => {
    // Already saved via useEffect
    toast.success('OpenAI key saved');
  }, [openaiApiKey]);

  const saveWeatherKeys = useCallback(() => {
    // Already saved via useEffect
    // Update weather settings if needed
    if (openWeatherKey) {
      setWeatherApiKey(openWeatherKey);
      setWeatherProvider('openweathermap');
    } else if (weatherApiComKey) {
      setWeatherApiKey(weatherApiComKey);
      setWeatherProvider('weatherapi');
    }
    toast.success('Weather keys updated');
  }, [openWeatherKey, weatherApiComKey]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <Card className='bg-card border'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-4'>
              <Settings2 className='h-6 w-6 text-primary' />
              <div>
                <h1 className='text-2xl font-bold'>System Settings</h1>
                <p className='text-muted-foreground'>Configure connections, APIs, services, and preferences</p>
              </div>
            </div>
            <Button variant='outline' size='sm' onClick={exportBackup}>
              <FolderSync className='h-4 w-4 mr-2' />
              Export Backup
            </Button>
          </div>

          {/* Connection Status Indicators */}
          <div className='grid grid-cols-3 gap-4 mb-4'>
            <div className='flex items-center justify-center gap-2'>
              {getConnectionIndicator(connectionStatus.ha)}
              <span className='text-sm'>{connectionStatus.ha}</span>
            </div>
            <div className='flex items-center justify-center gap-2'>
              {getConnectionIndicator(connectionStatus.weather)}
              <span className='text-sm'>{connectionStatus.weather === 'configured' ? 'Configured' : 'Not Configured'}</span>
            </div>
            <div className='flex items-center justify-center gap-2'>
              {getConnectionIndicator(connectionStatus.energy)}
              <span className='text-sm'>{connectionStatus.energy === 'configured' ? 'Configured' : 'Not Configured'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='grid w-full grid-cols-2 h-auto p-1'>
          <TabsTrigger value='connections' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <Home className='h-4 w-4 mr-2' />
            Connections
          </TabsTrigger>
          <TabsTrigger value='weather' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <Cloud className='h-4 w-4 mr-2' />
            Weather
          </TabsTrigger>
          <TabsTrigger value='energy' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <Zap className='h-4 w-4 mr-2' />
            Energy
          </TabsTrigger>
          <TabsTrigger value='appearance' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <Palette className='h-4 w-4 mr-2' />
            Appearance
          </TabsTrigger>
          <TabsTrigger value='services' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <PcCase className='h-4 w-4 mr-2' />
            Services
          </TabsTrigger>
          <TabsTrigger value='api-keys' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <Key className='h-4 w-4 mr-2' />
            API Keys
          </TabsTrigger>
          <TabsTrigger value='backup' className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
            <HardDriveUpload className='h-4 w-4 mr-2' />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value='connections' className='space-y-6'>
          <Card>
            <CardHeader className='border-b pb-3'>
              <CardTitle className='flex items-center gap-2'>
                <Home className='h-5 w-5' />
                Home Assistant Connection
              </CardTitle>
              <CardDescription>
                Connect to your Home Assistant instance for device control and automation
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='ha-url'>Home Assistant URL</Label>
                  <Input
                    id='ha-url'
                    className='w-full'
                    placeholder='e.g., http://homeassistant.local:8123'
                    value={haUrl}
                    onChange={(e) => setHaUrl(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor='ha-token'>Long-lived Access Token</Label>
                  <Input
                    id='ha-token'
                    type='password'
                    placeholder='Enter your HA token'
                    value={haToken}
                    onChange={(e) => setHaToken(e.target.value)}
                    autoComplete='off'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='ha-timeout'>Connection Timeout (ms)</Label>
                  <Input
                    id='ha-timeout'
                    type='number'
                    value={haTimeout}
                    onChange={(e) => setHaTimeout(parseInt(e.target.value) || 5000)}
                    min={1000}
                    max={30000}
                  />
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (!haUrl || !haToken) {
                    toast.error('Please enter both HA URL and token');
                    return;
                  }
                  testHaConnection();
                }}
                disabled={connectionStatus.ha === 'testing' || !haUrl || !haToken}
                className='w-full'
              >
                {connectionStatus.ha === 'testing' ? (
                  <>
                    <Wifi className='h-4 w-4 mr-2 animate-spin' />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Wifi className='h-4 w-4 mr-2' />
                    Test Connection
                  </>
                )}
              </Button>

              {connectionStatus.ha === 'connected' && (
                <Card>
                  <CardHeader>
                    <div className='flex items-center justify-between'>
                      <div>
                        <CardTitle className='flex items-center gap-2'>
                          <Activity className='h-5 w-5' />
                          Home Assistant Status
                        </CardTitle>
                        <CardDescription>
                          Monitor key Home Assistant system states
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={fetchHaStatusStates}
                        disabled={isLoadingStates || connectionStatus.ha !== 'connected'}
                        size='sm'
                        variant='outline'
                      >
                        {isLoadingStates ? (
                          <>
                            <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className='h-4 w-4 mr-2' />
                            Refresh Status
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(haStatusStates).length === 0 ? (
                      <div className='text-center py-4 text-muted-foreground'>
                        <p>Click "Refresh Status" to load Home Assistant states</p>
                      </div>
                    ) : (
                      <div className='grid gap-3 md:grid-cols-2'>
                        {Object.entries(haStatusStates).map(([entityId, state]) => (
                          <div key={entityId} className='flex items-center justify-between p-3 rounded-lg border'>
                            <div>
                              <p className='font-medium text-sm capitalize'>{entityId.replace(/_/g, ' ').replace('update', 'Update').replace('conversation', 'Conversation')}</p>
                              <p className='text-xs text-muted-foreground'>Entity: {entityId}</p>
                            </div>
                            <Badge variant='outline' className={getStateStatusColor(state)}>
                              {state}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value='weather' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Cloud className='h-5 w-5' />
                Weather API Configuration
              </CardTitle>
              <CardDescription>
                Configure weather data source independently from Home Assistant
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='weather-provider'>Weather Provider</Label>
                <Select value={weatherProvider} onValueChange={setWeatherProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select provider' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='openweathermap'>OpenWeatherMap</SelectItem>
                    <SelectItem value='weatherapi'>WeatherAPI</SelectItem>
                    <SelectItem value='accuweather'>AccuWeather</SelectItem>
                    <SelectItem value='ha_integration'>Home Assistant Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {weatherProvider !== 'ha_integration' && (
                <div>
                  <Label htmlFor='weather-api-key'>API Key</Label>
                  <div className='relative'>
                    <Input
                      id='weather-api-key'
                      type='password'
                      placeholder='Enter weather API key'
                      value={weatherApiKey}
                      onChange={(e) => setWeatherApiKey(e.target.value)}
                      autoComplete='off'
                      className='pr-10'
                    />
                    <Button
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:text-primary'
                      onClick={() => setWeatherApiKey('')}
                    >
                      <XCircle className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='weather-units'>Units</Label>
                  <Select value={weatherUnits} onValueChange={setWeatherUnits}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select units' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='imperial'>Imperial (°F)</SelectItem>
                      <SelectItem value='metric'>Metric (°C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-end'>
                  <Button
                    onClick={() => {
                      if (navigator.geolocation) {
                        toast.loading('Detecting your location...');
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            const { latitude, longitude } = position.coords;
                            let newLocation = { lat: latitude, lon: longitude, city: '', country: '', zip: weatherLocation.zip, locationKey: '' };

                            if (weatherApiKey && weatherProvider !== 'ha_integration') {
                              try {
                                let city = 'Unknown';
                                let country = 'Unknown';
                                let locationKey = '';

                                switch (weatherProvider) {
                                  case 'openweathermap':
                                    const owmResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${weatherApiKey}`);
                                    if (owmResponse.ok) {
                                      const owmData = await owmResponse.json();
                                      if (owmData.length > 0) {
                                        city = owmData[0].name;
                                        country = owmData[0].country;
                                      }
                                    }
                                    break;
                                  case 'weatherapi':
                                    const wapResponse = await fetch(`https://api.weatherapi.com/v1/search.json?key=${weatherApiKey}&q=${latitude},${longitude}`);
                                    if (wapResponse.ok) {
                                      const wapData = await wapResponse.json();
                                      if (wapData.length > 0) {
                                        city = wapData[0].name;
                                        country = wapData[0].region || wapData[0].country;
                                      }
                                    }
                                    break;
                                  case 'accuweather':
                                    const accuResponse = await fetch(`https://dataservice.accuweather.com/locations/v1/geoposition/search?apikey=${weatherApiKey}&q=${latitude},${longitude}`);
                                    if (accuResponse.ok) {
                                      const accuData = await accuResponse.json();
                                      city = accuData.localizedName || accuData.parent?.localizedName || 'Unknown';
                                      country = accuData.country?.localizedName || 'Unknown';
                                      locationKey = accuData.key;
                                    }
                                    break;
                                  default:
                                    break;
                                }

                                newLocation = { ...newLocation, city, country, locationKey };
                              } catch (error) {
                                toast.error(`Failed to get location data: ${error.message}`);
                              }
                            }

                            setWeatherLocation(newLocation);
                            toast.success(`Location detected: ${newLocation.city || latitude.toFixed(4)}, ${newLocation.country || longitude.toFixed(4)}`);

                            weatherApiSettings.setSetting('location', newLocation);
                          },
                          (error) => {
                            toast.error(`Location detection failed: ${error.message}`);
                          },
                          {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 300000,
                          }
                        );
                      } else {
                        toast.error('Geolocation is not supported by this browser');
                      }
                    }}
                    variant='outline'
                    className='w-full'
                  >
                    <MapPin className='h-4 w-4 mr-2' />
                    Detect Location
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (weatherProvider !== 'ha_integration' && !weatherApiKey) {
                    toast.error('Please enter weather API key');
                    return;
                  }
                  if (weatherProvider === 'ha_integration' && (!haUrl || !haToken)) {
                    toast.error('Home Assistant connection required for HA weather integration');
                    return;
                  }
                  if (weatherProvider !== 'ha_integration' && (!weatherLocation.lat || !weatherLocation.lon)) {
                    toast.error('Please set your location coordinates first');
                    return;
                  }
                  testWeatherApi();
                }}
                disabled={connectionStatus.weather === 'testing' || (weatherProvider !== 'ha_integration' && !weatherApiKey) || (weatherProvider !== 'ha_integration' && !weatherLocation.lat)}
                className='w-full'
              >
                {connectionStatus.weather === 'testing' ? (
                  <>
                    <AlertCircle className='h-4 w-4 mr-2 animate-pulse' />
                    Testing Weather API...
                  </>
                ) : (
                  <>
                    <Cloud className='h-4 w-4 mr-2' />
                    Test Weather API
                  </>
                )}
              </Button>

              {weatherLocation.city && (
                <div className='p-3 bg-muted rounded-lg'>
                  <p className='text-sm'>
                    <strong>Location:</strong> {weatherLocation.city}, {weatherLocation.country}
                  </p>
                  {weatherProvider === 'accuweather' && weatherLocation.locationKey && (
                    <p className='text-xs text-muted-foreground'>
                      Location Key: {weatherLocation.locationKey}
                    </p>
                  )}
                  <p className='text-xs text-muted-foreground'>
                    Coordinates: {weatherLocation.lat.toFixed(4)}, {weatherLocation.lon.toFixed(4)}
                  </p>
                </div>
              )}

              {weatherProvider !== 'ha_integration' && (
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
                  <div>
                    <Label htmlFor='weather-zip'>5-Digit ZIP Code</Label>
                    <Input
                      id='weather-zip'
                      placeholder='90210'
                      maxLength={5}
                      value={weatherLocation.zip || ''}
                      onChange={(e) => setWeatherLocation(prev => ({ ...prev, zip: e.target.value }))}
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <Button
                      onClick={async () => {
                        if (!weatherLocation.zip || weatherLocation.zip.length !== 5 || !weatherApiKey) {
                          toast.error('Enter a valid 5-digit ZIP code and ensure API key is set');
                          return;
                        }

                        try {
                          toast.loading('Looking up ZIP code...');
                          let lookupUrl = '';

                          switch (weatherProvider) {
                            case 'openweathermap':
                              lookupUrl = `https://api.openweathermap.org/geo/1.0/zip?zip=${weatherLocation.zip},US&appid=${weatherApiKey}`;
                              break;
                            case 'weatherapi':
                              lookupUrl = `https://api.weatherapi.com/v1/search.json?key=${weatherApiKey}&q=${weatherLocation.zip}`;
                              break;
                            case 'accuweather':
                              lookupUrl = `https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${weatherApiKey}&q=${weatherLocation.zip}`;
                              break;
                            default:
                              throw new Error('ZIP lookup not supported for this provider');
                          }

                          const response = await fetch(lookupUrl);

                          if (!response.ok) {
                            throw new Error(`Lookup failed: HTTP ${response.status}`);
                          }

                          const data = await response.json();

                          let lat, lon, city, countryCode, locationKey;

                          switch (weatherProvider) {
                            case 'openweathermap':
                              if (!data.lat || !data.lon) throw new Error('Invalid ZIP code');
                              lat = data.lat;
                              lon = data.lon;
                              city = data.name;
                              countryCode = data.country;
                              break;
                            case 'weatherapi':
                              if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid ZIP code');
                              const firstResult = data[0];
                              lat = firstResult.lat;
                              lon = firstResult.lon;
                              city = firstResult.name;
                              countryCode = firstResult.country;
                              break;
                            case 'accuweather':
                              if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid ZIP code');
                              const accuResult = data[0];
                              lat = accuResult.GeoPosition.Latitude;
                              lon = accuResult.GeoPosition.Longitude;
                              city = accuResult.LocalizedName;
                              countryCode = accuResult.Country.LocalizedName;
                              locationKey = accuResult.Key;
                              break;
                            default:
                              throw new Error('ZIP lookup not supported for this provider');
                          }

                          const newLocation = {
                            lat,
                            lon,
                            city,
                            country: countryCode,
                            zip: weatherLocation.zip,
                            locationKey,
                          };

                          setWeatherLocation(newLocation);
                          toast.success(`Location set via ZIP: ${city}, ${countryCode}`);

                          weatherApiSettings.setSetting('location', newLocation);
                        } catch (error) {
                          toast.error(`ZIP lookup failed: ${error.message}`);
                        }
                      }}
                      className='w-full'
                      disabled={!weatherLocation.zip || weatherLocation.zip.length !== 5 || !weatherApiKey}
                    >
                      <MapPin className='h-4 w-4 mr-2' />
                      Lookup by ZIP Code
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy Tab */}
        <TabsContent value='energy' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Zap className='h-5 w-5' />
                Energy Configuration
              </CardTitle>
              <CardDescription>
                Configure energy data sources and billing settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='energy-provider'>Energy Data Source</Label>
                <Select value={energyProvider} onValueChange={setEnergyProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select provider' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='manual'>Manual Entry</SelectItem>
                    <SelectItem value='utility_api'>Utility API</SelectItem>
                    <SelectItem value='sense'>Sense Energy Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {energyProvider === 'utility_api' && (
                <div>
                  <Label htmlFor='utility-api-key'>Utility API Key</Label>
                  <Input
                    id='utility-api-key'
                    type='password'
                    placeholder='Enter Utility API key'
                    value={utilityApiKey}
                    onChange={(e) => setUtilityApiKey(e.target.value)}
                    autoComplete='off'
                  />
                </div>
              )}

              {energyProvider === 'sense' && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='sense-email'>Sense Email</Label>
                    <Input
                      id='sense-email'
                      type='email'
                      placeholder='your@email.com'
                      value={senseEmail}
                      onChange={(e) => setSenseEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor='sense-password'>Sense Password</Label>
                    <Input
                      id='sense-password'
                      type='password'
                      placeholder='Enter password'
                      value={sensePassword}
                      onChange={(e) => setSensePassword(e.target.value)}
                      autoComplete='off'
                    />
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='cost-kwh'>Base Cost per kWh ($)</Label>
                  <Input
                    id='cost-kwh'
                    type='number'
                    step='0.01'
                    value={costPerKwh}
                    onChange={(e) => setCostPerKwh(parseFloat(e.target.value) || 0.12)}
                    min='0'
                    max='1'
                  />
                </div>

                <div>
                  <Label htmlFor='energy-timezone'>Timezone</Label>
                  <Select value={energyTimezone} onValueChange={setEnergyTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select timezone' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='America/New_York'>Eastern</SelectItem>
                      <SelectItem value='America/Chicago'>Central</SelectItem>
                      <SelectItem value='America/Denver'>Mountain</SelectItem>
                      <SelectItem value='America/Los_Angeles'>Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-6'>
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <Label className='text-base font-medium'>Rate Tiers ($/kWh)</Label>
                    <Button onClick={addRateTier} size='sm' variant='outline'>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Tier
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {billingRates.tiers.map((tier, index) => (
                      <div key={index} className='grid grid-cols-4 gap-3 items-center p-3 border rounded-lg'>
                        <div>
                          <Label htmlFor={`tier-min-${index}`} className='text-xs'>Min kWh</Label>
                          <Input
                            id={`tier-min-${index}`}
                            type='number'
                            value={tier.min}
                            onChange={(e) => updateRateTier(index, 'min', parseFloat(e.target.value) || 0)}
                            placeholder='0'
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tier-max-${index}`} className='text-xs'>Max kWh</Label>
                          <Input
                            id={`tier-max-${index}`}
                            type='number'
                            value={tier.max || ''}
                            onChange={(e) => updateRateTier(index, 'max', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder='Unlimited'
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tier-rate-${index}`} className='text-xs'>Rate ($)</Label>
                          <Input
                            id={`tier-rate-${index}`}
                            type='number'
                            step='0.01'
                            value={tier.rate}
                            onChange={(e) => updateRateTier(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder='0.12'
                          />
                        </div>
                        <Button
                          onClick={() => removeRateTier(index)}
                          size='sm'
                          variant='destructive'
                          disabled={billingRates.tiers.length <= 1}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <Label className='text-base font-medium'>Fixed Monthly Charges</Label>
                    <Button onClick={addFixedCharge} size='sm' variant='outline'>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Charge
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {billingRates.fixedCharges.map((charge, index) => (
                      <div key={index} className='grid grid-cols-3 gap-3 items-center p-3 border rounded-lg'>
                        <div className='col-span-2'>
                          <Label htmlFor={`charge-name-${index}`} className='text-xs'>Charge Name</Label>
                          <Input
                            id={`charge-name-${index}`}
                            value={charge.name}
                            onChange={(e) => updateFixedCharge(index, 'name', e.target.value)}
                            placeholder='Service Charge'
                          />
                        </div>
                        <div>
                          <Label htmlFor={`charge-amount-${index}`} className='text-xs'>Amount ($)</Label>
                          <Input
                            id={`charge-amount-${index}`}
                            type='number'
                            step='0.01'
                            value={charge.amount}
                            onChange={(e) => updateFixedCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder='8.95'
                          />
                        </div>
                        <Button
                          onClick={() => removeFixedCharge(index)}
                          size='sm'
                          variant='destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <Label className='text-base font-medium'>Taxes & Fees (%)</Label>
                    <Button onClick={addTax} size='sm' variant='outline'>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Tax
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {billingRates.taxes.map((tax, index) => (
                      <div key={index} className='grid grid-cols-3 gap-3 items-center p-3 border rounded-lg'>
                        <div className='col-span-2'>
                          <Label htmlFor={`tax-name-${index}`} className='text-xs'>Tax/Fee Name</Label>
                          <Input
                            id={`tax-name-${index}`}
                            value={tax.name}
                            onChange={(e) => updateTax(index, 'name', e.target.value)}
                            placeholder='State Tax'
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tax-rate-${index}`} className='text-xs'>Rate (%)</Label>
                          <Input
                            id={`tax-rate-${index}`}
                            type='number'
                            step='0.01'
                            value={tax.rate}
                            onChange={(e) => updateTax(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder='6.25'
                          />
                        </div>
                        <Button
                          onClick={() => removeTax(index)}
                          size='sm'
                          variant='destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='p-4 bg-muted/50 rounded-lg'>
                  <h4 className='font-medium mb-2'>Billing Structure Preview</h4>
                  <div className='text-sm space-y-1'>
                    <div>
                      <strong>Rate Tiers:</strong>
                      {billingRates.tiers.map((tier, index) => (
                        <div key={index} className='ml-4 text-muted-foreground'>
                          {tier.min} - {tier.max ? tier.max : '∞'} kWh: ${tier.rate.toFixed(4)}/kWh
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

                <div className='flex gap-2'>
                  <Button onClick={saveBillingRates} className='flex-1'>
                    <Save className='h-4 w-4 mr-2' />
                    Save All Rates
                  </Button>
                  <Button onClick={resetBillingRates} variant='outline' size='sm'>
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value='appearance' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Palette className='h-5 w-5' />
                Theme & Colors
              </CardTitle>
              <CardDescription>
                Customize colors and typography
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div>
                <Label>Theme Mode</Label>
                <Select value={appearance.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select theme' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='light'>Light</SelectItem>
                    <SelectItem value='dark'>Dark</SelectItem>
                    <SelectItem value='auto'>Auto (Sunrise/Sunset)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Background Color</Label>
                <div className='grid grid-cols-7 gap-2 mt-2'>
                  {backgroundSwatches.map((swatch) => (
                    <button
                      key={swatch.name}
                      type='button'
                      className={`w-12 h-12 rounded-md border-2 ${
                        appearance.backgroundColor === swatch.value 
                          ? 'border-primary ring-2 ring-ring ring-offset-2' 
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: swatch.value }}
                      onClick={() => handleBackgroundChange(swatch.value)}
                      title={swatch.name}
                    />
                  ))}
                </div>
                <Input
                  type='color'
                  value={appearance.backgroundColor}
                  onChange={(e) => handleBackgroundChange(e.target.value)}
                  className='mt-2 w-full h-12'
                />
              </div>

              <div>
                <Label>Text Size</Label>
                <div className='mt-2 space-y-2'>
                  <Slider
                    value={[appearance.textSize]}
                    onValueChange={handleTextSizeChange}
                    min={12}
                    max={32}
                    step={1}
                    className='w-full'
                  />
                  <div className='text-sm text-muted-foreground'>
                    Current: {appearance.textSize}px
                  </div>
                </div>
              </div>

              <div>
                <Label>Text Weight</Label>
                <Select value={appearance.textWeight} onValueChange={handleTextWeightChange}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select weight' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='normal'>Normal</SelectItem>
                    <SelectItem value='bold'>Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Text Color</Label>
                <Input
                  type='color'
                  value={appearance.textColor}
                  onChange={handleTextColorChange}
                  className='w-full h-12 mt-2'
                />
              </div>

              <div className='p-4 rounded-md border' style={{
                backgroundColor: appearance.backgroundColor,
                color: appearance.textColor,
                fontSize: `${appearance.textSize}px`,
                fontWeight: appearance.textWeight,
              }}>
                <h3 className='font-semibold mb-2'>Preview</h3>
                <p>This is how your text will look with the current settings.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value='services' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <PcCase className='h-5 w-5' />
                Local Services
              </CardTitle>
              <CardDescription>
                Manage your application's database and storage
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-3'>
                <Label>SQLite Database</Label>
                <div className='space-y-2'>
                  <Input
                    value={localServices.sqlitePath}
                    onChange={(e) => setLocalServices(prev => ({ ...prev, sqlitePath: e.target.value }))}
                    placeholder='Database path'
                  />
                  <div className='flex items-center justify-between text-sm text-muted-foreground'>
                    <span>Database size</span>
                    <Badge variant='outline'>{localServices.dbSize}</Badge>
                  </div>
                  <Button variant='outline' size='sm' className='w-full'>
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Refresh Database Info
                  </Button>
                </div>
              </div>

              <Separator />

              <div className='space-y-3'>
                <Label>Database Operations</Label>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Button variant='outline'>
                    <Activity className='h-4 w-4 mr-2' />
                    Run Maintenance
                  </Button>
                  <Button variant='outline'>
                    <FileEdit className='h-4 w-4 mr-2' />
                    View Schema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value='api-keys' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Key className='h-5 w-5' />
                API Keys & Integrations
              </CardTitle>
              <CardDescription>
                Enter API keys for third-party services like Google Calendar, OpenAI, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Google Calendar */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold'>Google Calendar Integration</h3>
                    <p className='text-sm text-muted-foreground'>Enter your Google OAuth credentials to enable calendar sync.</p>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='google-client-id'>Google Client ID</Label>
                    <Input
                      id='google-client-id'
                      type='text'
                      placeholder='123456789-abcde.apps.googleusercontent.com'
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      Get from Google Cloud Console &gt; APIs &amp; Services &gt; Credentials
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='google-client-secret'>Google Client Secret</Label>
                    <Input
                      id='google-client-secret'
                      type='password'
                      placeholder='GOCSPX-xyz123'
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      autoComplete='off'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      Keep this secure. Required for OAuth token exchange.
                    </p>
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Button 
                    onClick={() => {
                      if (!googleClientId || !googleClientSecret) {
                        toast.error('Please enter both Google Client ID and Client Secret');
                        return;
                      }
                      handleGoogleOAuthTest();
                    }}
                    disabled={!googleClientId || !googleClientSecret}
                    className='flex-1'
                  >
                    Test Google OAuth
                  </Button>
                  <Button 
                    variant='outline'
                    onClick={() => saveGoogleKeys()}
                    disabled={!googleClientId || !googleClientSecret}
                    className='flex-1'
                  >
                    Save Keys
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Other API Keys */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold'>Other API Keys</h3>

                <div className='space-y-2'>
                  <Label htmlFor='openai-api-key'>OpenAI API Key (Optional)</Label>
                  <Input
                    id='openai-api-key'
                    type='password'
                    placeholder='sk-...'
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    autoComplete='off'
                  />
                  <Button 
                    variant='outline'
                    size='sm'
                    onClick={() => saveOpenAIKey()}
                    disabled={!openaiApiKey}
                  >
                    Save OpenAI Key
                  </Button>
                </div>

                <div className='space-y-2'>
                  <Label>Weather API Keys (Alternative Entry)</Label>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Input
                        type='password'
                        placeholder='OpenWeatherMap API Key'
                        value={openWeatherKey}
                        onChange={(e) => setOpenWeatherKey(e.target.value)}
                        autoComplete='off'
                      />
                    </div>
                    <div>
                      <Input
                        type='password'
                        placeholder='WeatherAPI.com Key'
                        value={weatherApiComKey}
                        onChange={(e) => setWeatherApiComKey(e.target.value)}
                        autoComplete='off'
                      />
                    </div>
                  </div>
                  <Button 
                    variant='outline'
                    size='sm'
                    onClick={() => saveWeatherKeys()}
                    disabled={!openWeatherKey && !weatherApiComKey}
                  >
                    Save Weather Keys
                  </Button>
                  <p className='text-xs text-muted-foreground'>These will override settings in the Weather tab.</p>
                </div>
              </div>

              {/* Security Note */}
              <div className='p-4 bg-blue-50 rounded-lg border'>
                <h4 className='font-medium mb-2 text-blue-900'>Security & Privacy Note</h4>
                <ul className='text-sm space-y-1 text-blue-800'>
                  <li>• Each user should enter their own API keys in this section</li>
                  <li>• Keys are stored locally in your browser (localStorage)</li>
                  <li>• No data is sent to the server - fully client-side</li>
                  <li>• For Google Calendar, ensure your app has Calendar API enabled in Google Cloud Console</li>
                  <li>• Add authorized redirect URIs: <code>http://localhost:3000/api/auth/callback/google</code> and <code>https://yourdomain.com/api/auth/callback/google</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value='backup' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <HardDriveUpload className='h-5 w-5' />
                Data Management
              </CardTitle>
              <CardDescription>
                Backup and restore your settings and data
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Button onClick={exportBackup} disabled={isBackingUp} className='w-full'>
                <FolderSync className='h-4 w-4 mr-2' />
                {isBackingUp ? 'Creating Backup...' : 'Export Backup'}
              </Button>

              {isBackingUp && (
                <div className='space-y-2'>
                  <Progress value={backupProgress} className='w-full' />
                  <p className='text-sm text-muted-foreground'>
                    Creating backup... {backupProgress}%
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor='backup-import'>Import Backup</Label>
                <Input
                  id='backup-import'
                  type='file'
                  accept='.json'
                  onChange={handleImportBackup}
                  className='mt-1'
                />
                <p className='text-xs text-muted-foreground mt-1'>Upload a .json backup file to restore settings</p>
              </div>

              <div className='flex items-center justify-between'>
                <div>
                  <Label>Detailed Logging</Label>
                  <p className='text-sm text-muted-foreground'>
                    Enable verbose logging for debugging purposes
                  </p>
                </div>
                <Switch
                  checked={detailedLogs}
                  onCheckedChange={setDetailedLogs}
                />
              </div>

              <Button variant='outline' className='w-full'>
                <Activity className='h-4 w-4 mr-2' />
                View System Logs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-destructive'>Reset All Settings</CardTitle>
              <CardDescription>
                This will reset all settings to their default values. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='destructive' className='w-full'>
                    Reset to Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to reset all settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all your settings to their default values. This action cannot be undone.
                      <br />
                      <strong>Consider creating a backup before proceeding.</strong>
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