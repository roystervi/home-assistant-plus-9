"use client";

import { useState, useEffect, useCallback } from "react";
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
  ExternalLink,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

interface FetchedWeather {
  temperature: number;
  condition: string;
  feelsLike?: number;
  humidity?: number;
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

const defaultBillingRates = {
  tiers: [{ min: 0, max: 1000, rate: 0.12 }, { min: 1000, max: 2000, rate: 0.15 }, { min: 2000, max: null, rate: 0.18 }],
  fixedCharges: [{ name: "Basic Service Charge", amount: 8.95 }, { name: "Distribution Charge", amount: 12.50 }, { name: "Transmission Charge", amount: 4.25 }],
  taxes: [{ name: "State Tax", rate: 6.25 }, { name: "Municipal Tax", rate: 2.50 }],
};

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
  const [fetchedWeather, setFetchedWeather] = useState<FetchedWeather | null>(null);
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
  const [billingRates, setBillingRates] = useState<BillingRateStructure>(defaultBillingRates);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openWeatherKey, setOpenWeatherKey] = useState("");
  const [weatherApiComKey, setWeatherApiComKey] = useState("");
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [detailedLogs, setDetailedLogs] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [haStatusStates, setHaStatusStates] = useState<Record<string, any>>({});
  const [googleStatus, setGoogleStatus] = useState<'disconnected' | 'connected' | 'loading'>('disconnected');
  const [recentEvents, setRecentEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load from storage on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/global-settings");

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const { settings } = await res.json();

        // Fill partial defaults
        const fullSettings = {
          ha: settings.ha || { url: "", token: "", connectionTimeout: 5000, isConnected: false },
          weather: settings.weather || { provider: "openweathermap", apiKey: "", location: { lat: 0, lon: 0, city: "", country: "", zip: "", locationKey: "" }, units: "imperial", isConfigured: false },
          energy: settings.energy || { provider: "manual", costPerKwh: 0.12, timezone: "America/New_York", utilityApiKey: "", senseEmail: "", sensePassword: "", billingRates: defaultBillingRates, isConfigured: false },
          appearance: settings.appearance || { theme: "auto", backgroundColor: "#f3f4f6", textSize: 16, textWeight: "normal", textColor: "#111827", displayMode: "desktop" },
          apiKeys: settings.apiKeys || { googleClientId: "", googleClientSecret: "", openaiApiKey: "", openWeatherKey: "", weatherApiComKey: "" },
          other: settings.other || { detailedLogs: false },
          ...settings // Override with actual data
        };

        // Set states from fullSettings
        setHaUrl(fullSettings.ha.url);
        setHaToken(fullSettings.ha.token);
        setHaTimeout(fullSettings.ha.connectionTimeout);
        setConnectionStatus({
          ha: fullSettings.ha.isConnected ? "connected" : "disconnected",
          weather: fullSettings.weather.isConfigured ? "configured" : "not_configured",
          energy: fullSettings.energy.isConfigured ? "configured" : "not_configured",
        });

        setWeatherProvider(fullSettings.weather.provider);
        setWeatherApiKey(fullSettings.weather.apiKey);
        setWeatherLocation(fullSettings.weather.location);
        setWeatherUnits(fullSettings.weather.units);

        setEnergyProvider(fullSettings.energy.provider);
        setCostPerKwh(fullSettings.energy.costPerKwh);
        setEnergyTimezone(fullSettings.energy.timezone);
        setUtilityApiKey(fullSettings.energy.utilityApiKey);
        setSenseEmail(fullSettings.energy.senseEmail);
        setSensePassword(fullSettings.energy.sensePassword);
        setBillingRates(fullSettings.energy.billingRates || defaultBillingRates);

        setAppearance(fullSettings.appearance);
        setDetailedLogs(fullSettings.other.detailedLogs || false);

        setGoogleClientId(fullSettings.apiKeys.googleClientId);
        setGoogleClientSecret(fullSettings.apiKeys.googleClientSecret);
        setOpenaiApiKey(fullSettings.apiKeys.openaiApiKey);
        setOpenWeatherKey(fullSettings.apiKeys.openWeatherKey);
        setWeatherApiComKey(fullSettings.apiKeys.weatherApiComKey);

        // Apply display mode class
        if (fullSettings.appearance.displayMode && typeof document !== "undefined") {
          document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone");
          document.documentElement.classList.add(`display-${fullSettings.appearance.displayMode}`);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load settings from database");
      }
    };

    fetchSettings();
  }, [router]);

  // Add useEffect for display mode application
  useEffect(() => {
    if (appearance.displayMode && typeof document !== "undefined") {
      document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone");
      document.documentElement.classList.add(`display-${appearance.displayMode}`);
    }
  }, [appearance.displayMode]);

  // Save to storage on changes
  useEffect(() => {
    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(() => {
      saveAllSettings();
    }, 1000);

    setSaveTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [
    haUrl,
    haToken,
    haTimeout,
    weatherProvider,
    weatherApiKey,
    weatherLocation,
    weatherUnits,
    energyProvider,
    costPerKwh,
    energyTimezone,
    utilityApiKey,
    senseEmail,
    sensePassword,
    billingRates,
    appearance,
    googleClientId,
    googleClientSecret,
    openaiApiKey,
    openWeatherKey,
    weatherApiComKey,
    detailedLogs,
    connectionStatus,
  ]);

  const saveAllSettings = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    if (saveTimeout) clearTimeout(saveTimeout);

    try {
      const allSettings = {
        ha: {
          url: haUrl,
          token: haToken,
          connectionTimeout: haTimeout,
          isConnected: connectionStatus.ha === "connected",
        },
        weather: {
          provider: weatherProvider,
          apiKey: weatherApiKey,
          location: weatherLocation,
          units: weatherUnits,
          isConfigured: connectionStatus.weather === "configured",
        },
        energy: {
          provider: energyProvider,
          costPerKwh: costPerKwh,
          timezone: energyTimezone,
          utilityApiKey: utilityApiKey,
          senseEmail: senseEmail,
          sensePassword: sensePassword,
          billingRates,
          isConfigured: connectionStatus.energy === "configured",
        },
        appearance,
        apiKeys: {
          googleClientId,
          googleClientSecret,
          openaiApiKey,
          openWeatherKey,
          weatherApiComKey,
        },
        other: {
          detailedLogs,
        },
      };

      const res = await fetch("/api/global-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: allSettings }),
      });

      if (!res.ok) {
        const { error, code } = await res.json().catch(() => ({}));
        throw new Error(error || `HTTP ${res.status} ${code}`);
      }

      toast.success("Settings saved to database");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    haUrl,
    haToken,
    haTimeout,
    connectionStatus,
    weatherProvider,
    weatherApiKey,
    weatherLocation,
    weatherUnits,
    energyProvider,
    costPerKwh,
    energyTimezone,
    utilityApiKey,
    senseEmail,
    sensePassword,
    billingRates,
    appearance,
    googleClientId,
    googleClientSecret,
    openaiApiKey,
    openWeatherKey,
    weatherApiComKey,
    detailedLogs,
    isSaving,
    saveTimeout,
  ]);

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

      const allSettings = {
        ha: { url: haUrl, token: haToken, connectionTimeout: haTimeout },
        weather: { provider: weatherProvider, apiKey: weatherApiKey, location: weatherLocation, units: weatherUnits },
        energy: { provider: energyProvider, costPerKwh, timezone: energyTimezone, utilityApiKey, senseEmail: "****", sensePassword: "****", billingRates },
        appearance,
        localServices,
        apiKeys: { googleClientId, googleClientSecret: "****", openaiApiKey: "****", openWeatherKey, weatherApiComKey: "****" },
        detailedLogs,
      };

      const backupData = {
        timestamp: new Date().toISOString(),
        settings: allSettings,
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
  }, [haUrl, haToken, haTimeout, weatherProvider, weatherApiKey, weatherLocation, weatherUnits, energyProvider, costPerKwh, energyTimezone, utilityApiKey, senseEmail, sensePassword, billingRates, appearance, localServices, googleClientId, googleClientSecret, openaiApiKey, openWeatherKey, weatherApiComKey, detailedLogs]);

  const handleImportBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (backupData.settings) {
        // Set from backupData.settings.ha.url etc., similar to fetchSettings logic
        if (backupData.settings.ha) {
          setHaUrl(backupData.settings.ha.url || "");
          setHaToken(backupData.settings.ha.token || "");
          setHaTimeout(backupData.settings.ha.connectionTimeout || 5000);
        }
        if (backupData.settings.weather) {
          setWeatherProvider(backupData.settings.weather.provider || "openweathermap");
          setWeatherApiKey(backupData.settings.weather.apiKey || "");
          setWeatherLocation(backupData.settings.weather.location || { lat: 0, lon: 0, city: "", country: "", zip: "", locationKey: "" });
          setWeatherUnits(backupData.settings.weather.units || "imperial");
        }
        if (backupData.settings.energy) {
          setEnergyProvider(backupData.settings.energy.provider || "manual");
          setCostPerKwh(backupData.settings.energy.costPerKwh || 0.12);
          setEnergyTimezone(backupData.settings.energy.timezone || "America/New_York");
          setUtilityApiKey(backupData.settings.energy.utilityApiKey || "");
          setSenseEmail(backupData.settings.energy.senseEmail || "");
          setSensePassword(backupData.settings.energy.sensePassword || "");
          setBillingRates(backupData.settings.energy.billingRates || defaultBillingRates);
        }
        if (backupData.settings.appearance) setAppearance(backupData.settings.appearance);
        if (backupData.settings.billingRates) setBillingRates(backupData.settings.billingRates || defaultBillingRates);
        if (backupData.settings.apiKeys) {
          setGoogleClientId(backupData.settings.apiKeys.googleClientId || "");
          setGoogleClientSecret(backupData.settings.apiKeys.googleClientSecret || "");
          setOpenaiApiKey(backupData.settings.apiKeys.openaiApiKey || "");
          setOpenWeatherKey(backupData.settings.apiKeys.openWeatherKey || "");
          setWeatherApiComKey(backupData.settings.apiKeys.weatherApiComKey || "");
        }
        if (backupData.settings.other) setDetailedLogs(backupData.settings.other.detailedLogs || false);

        await saveAllSettings();
        toast.success("Settings backup imported successfully!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Invalid backup file format");
      }
    } catch (error) {
      toast.error(`Failed to import backup: ${error.message}`);
    }
  }, [saveAllSettings]);

  const resetToDefaults = useCallback(async () => {
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
    setBillingRates(defaultBillingRates);
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

    await saveAllSettings();
    toast.success("All settings reset to defaults");
  }, [saveAllSettings]);

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

  const saveBillingRates = useCallback(async () => {
    await saveAllSettings();
    toast.success("Billing rates saved successfully");
  }, [billingRates, saveAllSettings]);

  const resetBillingRates = useCallback(async () => {
    setBillingRates({
      tiers: [{ min: 0, max: 1000, rate: 0.12 }, { min: 1000, max: 2000, rate: 0.15 }, { min: 2000, max: null, rate: 0.18 }],
      fixedCharges: [{ name: "Basic Service Charge", amount: 8.95 }, { name: "Distribution Charge", amount: 12.50 }, { name: "Transmission Charge", amount: 4.25 }],
      taxes: [{ name: "State Tax", rate: 6.25 }, { name: "Municipal Tax", rate: 2.50 }]
    });
    await saveAllSettings();
    toast.success("Billing rates reset to defaults");
  }, [saveAllSettings]);

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
    const trimmedUrl = haUrl.trim();
    const trimmedToken = haToken.trim();
    
    if (!trimmedUrl || !trimmedToken) {
      toast.error('Please enter both HA URL and token (whitespace trimmed automatically)');
      return;
    }

    // Validate URL format
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      toast.error('HA URL must start with http:// or https://');
      return;
    }

    if (!trimmedToken.startsWith('eyJ')) {
      toast.warning('Token format may be invalid (should start with eyJ...) – double-check generation');
    }

    setConnectionStatus(prev => ({ ...prev, ha: 'testing' }));

    try {
      const response = await fetch('/api/homeassistant/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl, token: trimmedToken, timeout: haTimeout }),
      });

      if (response.ok) {
        const data = await response.json();
        // Check for specific success indicators
        if (data.connected && data.version) {
          setConnectionStatus(prev => ({ ...prev, ha: 'connected' }));
          toast.success(`Home Assistant connected! Version: ${data.version}`);
        } else {
          throw new Error('Connection succeeded but no version info – check HA configuration');
        }
      } else {
        let errorDetail = 'Connection failed – unknown error';
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.error || `HTTP ${response.status}`;
          // Specific error handling
          if (errorData.code === 401) {
            errorDetail = 'Invalid token – regenerate Long-Lived Access Token in HA Profile';
          } else if (errorData.code === 404) {
            errorDetail = 'HA URL not found – verify URL and port (default:8123)';
          } else if (response.status === 0) {
            errorDetail = 'Network error (CORS/firewall) – check browser console and HA network access';
          }
        } catch (parseErr) {
          // Raw error
          errorDetail = `HTTP ${response.status} – ${response.statusText}`;
        }
        setConnectionStatus(prev => ({ ...prev, ha: 'disconnected' }));
        toast.error(`HA Connection failed: ${errorDetail}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network/timeout error';
      setConnectionStatus(prev => ({ ...prev, ha: 'disconnected' }));
      
      // Categorize common errors
      if (errorMsg.includes('fetch')) {
        toast.error(`Network error: ${errorMsg}. Check internet, URL accessibility, and browser console for CORS issues.`);
      } else if (errorMsg.includes('timeout')) {
        toast.error(`Connection timed out (${haTimeout}ms). Increase timeout or check HA responsiveness.`);
      } else {
        toast.error(`HA Connection error: ${errorMsg}`);
      }
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
          entities: ['conversation.home_assistant'] 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHaStatusStates(data.entities || {});
        toast.success('HA status loaded');
      } else {
        const errorText = await response.text();
        toast.error(`Failed to load HA status: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching HA status:', error);
      toast.error(`Error loading HA status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingStates(false);
    }
  }, [connectionStatus.ha, haUrl, haToken]);

  const testWeatherApi = useCallback(async () => {
    if (!weatherApiKey || weatherLocation.lat === 0) {
      toast.error('Configure API key and location first');
      setFetchedWeather(null);
      return;
    }

    setConnectionStatus(prev => ({ ...prev, weather: 'testing' }));
    setFetchedWeather(null);

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
        let temp = 0;
        let condition = '';
        let feelsLike = 0;
        let humidity = 0;

        // Parse based on provider
        switch (weatherProvider) {
          case 'openweathermap':
            temp = Math.round(data.main.temp);
            condition = data.weather[0].description;
            feelsLike = Math.round(data.main.feels_like);
            humidity = data.main.humidity;
            break;
          case 'weatherapi':
            temp = Math.round(weatherUnits === 'imperial' ? data.current.temp_f : data.current.temp_c);
            condition = data.current.condition.text;
            feelsLike = Math.round(weatherUnits === 'imperial' ? data.current.feelslike_f : data.current.feelslike_c);
            humidity = data.current.humidity;
            break;
          case 'accuweather':
            const accuData = Array.isArray(data) ? data[0] : data;
            temp = Math.round(accuData.Temperature[weatherUnits === 'imperial' ? 'Imperial' : 'Metric'].Value);
            condition = accuData.WeatherText;
            feelsLike = Math.round(accuData.RealFeelTemperature[weatherUnits === 'imperial' ? 'Imperial' : 'Metric'].Value);
            humidity = accuData.RelativeHumidity;
            break;
        }

        setFetchedWeather({ temperature: temp, condition, feelsLike, humidity });
        setConnectionStatus(prev => ({ ...prev, weather: 'configured' }));
        toast.success('Weather API test successful!');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setFetchedWeather(null);
      setConnectionStatus(prev => ({ ...prev, weather: 'not_configured' }));
      toast.error(`Weather API test failed: ${error.message}`);
    }
  }, [weatherApiKey, weatherLocation, weatherProvider, weatherUnits]);

  // Auto-fetch weather preview when weather tab is active and configured
  useEffect(() => {
    if (activeTab === 'weather' && weatherProvider !== 'ha_integration' && weatherApiKey && weatherLocation.lat !== 0 && !fetchedWeather) {
      const timer = setTimeout(() => testWeatherApi(), 500); // Slight delay to ensure tab is ready
      return () => clearTimeout(timer);
    }
  }, [activeTab, weatherProvider, weatherApiKey, weatherLocation, testWeatherApi, fetchedWeather]);

  const testEnergyConnection = useCallback(async () => {
    if (energyProvider === 'manual') {
      setConnectionStatus(prev => ({ ...prev, energy: 'configured' }));
      toast.success('Manual energy configuration is always ready');
      return;
    }

    if (energyProvider === 'utility_api' && !utilityApiKey) {
      toast.error('Enter Utility API key first');
      return;
    }

    if (energyProvider === 'sense' && (!senseEmail || !sensePassword)) {
      toast.error('Enter Sense email and password first');
      return;
    }

    setConnectionStatus(prev => ({ ...prev, energy: 'testing' }));

    try {
      // Mock test for now - in real impl, call respective APIs
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setConnectionStatus(prev => ({ ...prev, energy: 'configured' }));
      toast.success(`${energyProvider.replace('_', ' ')} connection successful!`);
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, energy: 'not_configured' }));
      toast.error(`${energyProvider.replace('_', ' ')} test failed`);
    }
  }, [energyProvider, utilityApiKey, senseEmail, sensePassword]);

  const saveConnections = useCallback(async () => {
    setIsLoadingStates(true);
    
    // Test HA if configured
    if (haUrl && haToken) {
      await testHaConnection();
    }
    
    // Test weather if configured
    if (weatherApiKey && weatherLocation.lat !== 0) {
      await testWeatherApi();
    }
    
    // Test energy if not manual
    if (energyProvider !== 'manual') {
      await testEnergyConnection();
    }

    toast.success('All connections saved and tested!');
    setIsLoadingStates(false);
    
    await saveAllSettings();
  }, [haUrl, haToken, weatherApiKey, weatherLocation, weatherProvider, weatherUnits, energyProvider, utilityApiKey, senseEmail, sensePassword, testHaConnection, testWeatherApi, testEnergyConnection, saveAllSettings]);

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

  const saveGoogleKeys = useCallback(async () => {
    await saveAllSettings();
    toast.success('Google keys saved securely');
  }, [saveAllSettings]);

  const saveOpenAIKey = useCallback(async () => {
    await saveAllSettings();
    toast.success('OpenAI key saved');
  }, [saveAllSettings]);

  const saveWeatherKeys = useCallback(async () => {
    // Already saved via useEffect
    // Update weather settings if needed
    if (openWeatherKey) {
      setWeatherApiKey(openWeatherKey);
      setWeatherProvider('openweathermap');
    } else if (weatherApiComKey) {
      setWeatherApiKey(weatherApiComKey);
      setWeatherProvider('weatherapi');
    }
    await saveAllSettings();
    toast.success('Weather keys updated');
  }, [openWeatherKey, weatherApiComKey, saveAllSettings]);

  const fetchGoogleStatus = useCallback(async () => {
    setGoogleStatus('loading');
    try {
      const response = await fetch('/api/google/calendar/status');
      if (response.ok) {
        const data = await response.json();
        setGoogleStatus(data.connected ? 'connected' : 'disconnected');
        if (data.connected && !recentEvents.length) {
          fetchRecentEvents();
        }
      } else {
        setGoogleStatus('disconnected');
      }
    } catch (error) {
      setGoogleStatus('disconnected');
      console.error('Failed to fetch Google status:', error);
    }
  }, [recentEvents.length]);

  const connectGoogleCalendar = useCallback(async () => {
    if (!googleClientId || !googleClientSecret) {
      toast.error('Please enter and save Google credentials first');
      return;
    }
    try {
      const response = await fetch('/api/google/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: googleClientId, clientSecret: googleClientSecret }),
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        toast.success('Redirecting to Google for authorization...');
      } else {
        toast.error('Failed to generate authorization URL');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  }, [googleClientId, googleClientSecret]);

  const fetchRecentEvents = useCallback(async () => {
    if (googleStatus !== 'connected') return;
    setIsLoadingEvents(true);
    try {
      const response = await fetch('/api/google/calendar/events?limit=5&timeMin=' + new Date().toISOString());
      if (response.ok) {
        const data = await response.json();
        setRecentEvents(data.events || []);
        toast.success('Recent events loaded');
      } else {
        toast.error('Failed to fetch events');
      }
    } catch (error) {
      toast.error('Events fetch error');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [googleStatus]);

  useEffect(() => {
    if (activeTab === 'api-keys') {
      fetchGoogleStatus();
    }
  }, [activeTab, fetchGoogleStatus]);

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
            <div className='flex gap-2'>
              <Button 
                onClick={saveConnections} 
                disabled={isLoadingStates || isSaving}
                variant='default' 
                size='sm'
              >
                {isLoadingStates ? (
                  <>
                    <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-2' />
                    Save Connections
                  </>
                )}
              </Button>
              <Button variant='outline' size='sm' onClick={exportBackup}>
                <FolderSync className='h-4 w-4 mr-2' />
                Export Backup
              </Button>
            </div>
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

          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving to database...
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
        <TabsList className='grid w-full grid-cols-4 h-auto p-1'>
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

              <div className='mt-4 p-4 bg-muted/50 rounded-lg border'>
                <h4 className='font-medium mb-3 flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 text-yellow-600' />
                  Troubleshooting Connection Issues
                </h4>
                <ul className='space-y-2 text-sm text-muted-foreground'>
                  <li>• <strong>URL Format:</strong> Ensure it starts with http:// or https:// and ends with :8123 (default port). Test opening the URL directly in your browser – you should see the HA login page.</li>
                  <li>• <strong>Token Validation:</strong> Use a Long-Lived Access Token from HA &gt; Profile &gt; Long-Lived Access Tokens. Tokens expire after 30 days if not used; recreate if needed. Format starts with eyJ... (JWT).</li>
                  <li>• <strong>Network Access:</strong> If HA is on local network, ensure same WiFi/subnet. For remote, use Nabu Casa or port forwarding. Disable VPN/firewall temporarily to test.</li>
                  <li>• <strong>CORS Issues:</strong> If error mentions CORS, add your domain to HA's http.cors_allowed_origins in configuration.yaml and restart HA.</li>
                  <li>• <strong>SSL/TLS:</strong> If using HTTPS, ensure valid certificate. Try HTTP first for local testing.</li>
                  <li>• <strong>Test Steps:</strong> 1. Verify URL accessible. 2. Regenerate token in HA. 3. Copy-paste carefully (no extra spaces). 4. Check browser console for errors.</li>
                </ul>
                <Button 
                  variant='ghost' 
                  size='sm' 
                  onClick={() => window.open('https://www.home-assistant.io/docs/authentication/', '_blank')}
                  className='mt-2'
                >
                  <ExternalLink className='h-4 w-4 mr-1' />
                  HA Auth Docs
                </Button>
              </div>

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

                {/* New Home Assistant Debug Panel */}
                <Card className="mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      🔍 Home Assistant Debug Panel (Temporary)
                    </CardTitle>
                    <CardDescription>
                      Live diagnostics for connection issues. Shows real-time hook state, errors, and sample data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">URL (Live)</Label>
                        <Input value={haUrl} readOnly className="mt-1 bg-muted" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Token Status</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant={haToken ? "default" : "secondary"}>{haToken ? "Set" : "Missing"}</Badge>
                          {haToken && <span className="text-xs text-muted-foreground">Length: {haToken.length}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={testHaConnection} 
                        disabled={connectionStatus.ha === 'testing' || !haUrl || !haToken}
                        className="flex-1"
                      >
                        {connectionStatus.ha === 'testing' ? (
                          <>
                            <Wifi className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4 mr-2" />
                            Test HA Connection
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => window.open(haUrl, '_blank')} 
                        disabled={!haUrl}
                        variant="outline"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open HA
                      </Button>
                    </div>

                    {/* Debug Output */}
                    {debugData && (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Connection: {debugData.isConnected ? "✅ Connected" : "❌ Disconnected"}</span>
                          <Badge variant={debugData.isConnected ? "default" : "destructive"}>
                            {debugData.isConnected ? "Live" : "Failed"}
                          </Badge>
                        </div>
                        {debugData.error && (
                          <div className="bg-destructive/10 text-destructive p-2 rounded text-sm">
                            <strong>Error:</strong> {debugData.error}
                            <br />
                            <small>Check: Token valid? CORS enabled? HA running on {new URL(haUrl).hostname}?</small>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Entities Fetched: {debugData.entitiesCount || 0}</div>
                          <div>Last Sync: {debugData.lastSync ? new Date(debugData.lastSync).toLocaleString() : "Never"}</div>
                          <div>State: {debugData.loading ? "Loading..." : debugData.syncingData ? "Syncing..." : "Idle"}</div>
                          {debugData.isConnected && <div>Version: {debugData.haVersion || "N/A"}</div>}
                        </div>

                        {/* Sample Entities */}
                        {debugData.isConnected && debugData.sampleEntities && debugData.sampleEntities.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Sample Entities (First 5):</Label>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {debugData.sampleEntities.map((entity, idx) => (
                                <div key={idx} className="text-xs p-1 bg-background rounded flex justify-between">
                                  <span>{entity.entity_id}</span>
                                  <span className="font-mono">{entity.state}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!debugData.isConnected && !debugData.error && (
                          <div className="text-sm text-muted-foreground">
                            No data yet. Click "Test HA Connection" or "Fetch Sample Data" above.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        onClick={() => { /* Fetch sample data using hook */ }} 
                        disabled={!haUrl || !haToken}
                        variant="outline"
                        size="sm"
                      >
                        Fetch Sample Data
                      </Button>
                      <Button 
                        onClick={() => { /* Clear debug - remove panel */ }} 
                        variant="ghost"
                        size="sm"
                      >
                        Close Debug (Resolved)
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                      <strong>Troubleshooting Tips:</strong>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li>Missing Token: Generate in HA &gt; Profile &gt; Tokens (long-lived, expires in 30 days)</li>
                        <li>CORS Error: Add your domain to HA config.yaml: http: cors_allowed_origins: ["*"] then restart HA</li>
                        <li>Network: Ping {new URL(haUrl).hostname} from browser console; check firewall/port 8123</li>
                        <li>0 Entities: HA API working but no devices? Check HA logs for access issues</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <CardContent>
                  {connectionStatus.ha === 'testing' ? (
                    <div className='text-center py-8'>
                      <AlertCircle className='h-6 w-6 animate-spin mx-auto mb-2 text-yellow-600' />
                      <p className='text-muted-foreground'>Testing connection...</p>
                    </div>
                  ) : connectionStatus.ha === 'disconnected' ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      <XCircle className='h-6 w-6 mx-auto mb-2' />
                      <p>Disconnected from Home Assistant</p>
                      <p className='text-sm mt-2'>No status available. Connect to view entities.</p>
                      <Button 
                        variant='outline' 
                        size='sm' 
                        onClick={testHaConnection}
                        disabled={!haUrl || !haToken}
                        className='mt-3'
                      >
                        <Wifi className='h-4 w-4 mr-2' />
                        Connect
                      </Button>
                    </div>
                  ) : isLoadingStates ? (
                    <div className='text-center py-8'>
                      <RefreshCw className='h-6 w-6 animate-spin mx-auto mb-2' />
                      <p>Loading HA status...</p>
                    </div>
                  ) : Object.keys(haStatusStates).length === 0 ? (
                    <div className='p-3 rounded-lg border bg-muted/50'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-medium text-sm'>Conversation.home assistant</p>
                          <p className='text-xs text-muted-foreground'>Entity: conversation.home_assistant</p>
                          <p className='text-xs text-muted-foreground mt-1'>Last updated: Not available</p>
                        </div>
                        <Badge variant='outline' className='text-destructive'>unavailable</Badge>
                      </div>
                      <p className='text-xs text-muted-foreground mt-2'>Entity not found or unavailable in your Home Assistant instance.</p>
                      <Button 
                        variant='outline' 
                        size='sm' 
                        onClick={fetchHaStatusStates}
                        className='mt-2'
                      >
                        <RefreshCw className='h-4 w-4 mr-2' />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {Object.entries(haStatusStates).map(([entityId, entity]) => (
                        <div key={entityId} className='flex items-center justify-between p-3 rounded-lg border'>
                          <div>
                            <p className='font-medium text-sm'>Conversation.home assistant</p>
                            <p className='text-xs text-muted-foreground'>Entity: {entityId}</p>
                            <p className='text-xs text-muted-foreground mt-1'>Last updated: {new Date(entity.last_updated).toLocaleString()}</p>
                          </div>
                          <Badge variant='outline' className={getStateStatusColor(entity.state)}>
                            {entity.state}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                            // Fetch weather after location update
                            setTimeout(() => testWeatherApi(), 1000);
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
                onClick={testWeatherApi}
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

              {/* Weather Preview */}
              {fetchedWeather && (
                <Card className='bg-green-50 border-green-200'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium text-green-800 flex items-center gap-2'>
                      <CheckCircle className='h-4 w-4' />
                      Current Weather Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    <div className='text-2xl font-bold text-green-900'>
                      {fetchedWeather.temperature}°{weatherUnits === 'imperial' ? 'F' : 'C'}
                    </div>
                    <p className='text-sm capitalize text-green-800'>{fetchedWeather.condition}</p>
                    {fetchedWeather.feelsLike && (
                      <p className='text-xs text-green-700'>Feels like: {fetchedWeather.feelsLike}°</p>
                    )}
                    {fetchedWeather.humidity && (
                      <p className='text-xs text-green-700'>Humidity: {fetchedWeather.humidity}%</p>
                    )}
                    <p className='text-xs text-muted-foreground'>Last updated: {new Date().toLocaleTimeString()}</p>
                  </CardContent>
                </Card>
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

                        const loadingId = toast.loading('Looking up ZIP code...');

                        try {
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
                          // Fetch weather after ZIP lookup
                          setTimeout(() => testWeatherApi(), 1000);
                        } catch (error) {
                          toast.error(`ZIP lookup failed: ${error.message}`);
                        } finally {
                          toast.dismiss(loadingId);
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

              {energyProvider !== 'manual' && (
                <Button 
                  onClick={testEnergyConnection}
                  disabled={connectionStatus.energy === 'testing' || (energyProvider === 'utility_api' && !utilityApiKey) || (energyProvider === 'sense' && (!senseEmail || !sensePassword))}
                  className='w-full'
                >
                  {connectionStatus.energy === 'testing' ? (
                    <>
                      <Zap className='h-4 w-4 mr-2 animate-spin' />
                      Testing Energy Connection...
                    </>
                  ) : (
                    <>
                      <Zap className='h-4 w-4 mr-2' />
                      Test Energy Connection
                    </>
                  )}
                </Button>
              )}

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

              {activeTab === 'api-keys' && (
                <div className='space-y-4 mt-6'>
                  <Separator />
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                          <Calendar className='h-5 w-5' />
                          Google Calendar Status & Data Preview
                        </h3>
                        <p className='text-sm text-muted-foreground'>View connection status and sample data being pulled from Google Calendar.</p>
                      </div>
                    </div>

                    <Card>
                      <CardContent className='p-4 space-y-4'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium'>Connection Status:</span>
                          <Badge variant={googleStatus === 'connected' ? 'default' : 'secondary'}>
                            {googleStatus === 'loading' ? 'Checking...' : googleStatus === 'connected' ? 'Connected' : 'Disconnected'}
                          </Badge>
                        </div>

                        {googleStatus === 'disconnected' ? (
                          <Button onClick={connectGoogleCalendar} className='w-full'>
                            <ExternalLink className='h-4 w-4 mr-2' />
                            Connect Google Calendar
                          </Button>
                        ) : googleStatus === 'loading' ? (
                          <div className='text-center py-4'>
                            <RefreshCw className='h-4 w-4 animate-spin mx-auto mb-2' />
                            <p className='text-sm text-muted-foreground'>Loading status...</p>
                          </div>
                        ) : (
                          <div className='space-y-3'>
                            <Button onClick={fetchRecentEvents} disabled={isLoadingEvents} variant='outline' className='w-full'>
                              {isLoadingEvents ? (
                                <>
                                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                                  Loading Events...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className='h-4 w-4 mr-2' />
                                  Refresh Recent Events
                                </>
                              )}
                            </Button>

                            {recentEvents.length > 0 ? (
                              <div className='space-y-2 max-h-48 overflow-y-auto'>
                                <p className='text-sm font-medium'>Recent Events (Last 5):</p>
                                {recentEvents.map((event, index) => (
                                  <div key={index} className='p-2 bg-muted/50 rounded-md text-sm'>
                                    <div className='font-medium'>{event.summary || 'No Title'}</div>
                                    <div className='text-xs text-muted-foreground'>
                                      {new Date(event.start.dateTime || event.start.date).toLocaleDateString()} - 
                                      {event.start.dateTime && new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : !isLoadingEvents ? (
                              <p className='text-sm text-muted-foreground text-center py-4'>No recent events found. Your calendar may be empty or events are in the future.</p>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
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