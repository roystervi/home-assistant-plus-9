"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  LayoutDashboard,
  Zap,
  Camera,
  Workflow,
  Calendar,
  Pill,
  Coins,
  Thermometer,
  Shield,
  Settings,
  Monitor,
  Sun,
  Moon,
  SunMoon,
  Menu,
  ChevronLeft,
  Tv,
  Tablet,
  Smartphone,
  Music,
  Sprout,
  Maximize,
  Minimize,
  Bot
} from "lucide-react";
import { weatherApiSettings } from "@/lib/storage";
import { ThermostatProvider } from "@/contexts/ThermostatContext";
import { HomeAssistantProvider } from "@/contexts/HomeAssistantContext";

// Theme management
type Theme = "light" | "dark" | "auto";
type DisplayMode = "tv" | "desktop" | "tablet" | "phone";

interface WeatherData {
  temperature: number;
  condition: string;
  sunrise: string;
  sunset: string;
}

interface NewsItem {
  id: string;
  text: string;
  type: "info" | "warning" | "status";
}

interface ClientLayoutProps {
  currentPage: string;
  children: ReactNode;
}

const navigation = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "assistant", name: "Assistant", icon: Bot },
  { id: "energy", name: "Energy", icon: Zap },
  { id: "cameras", name: "Cameras", icon: Camera },
  { id: "automations", name: "Automations", icon: Workflow },
  { id: "agenda", name: "Agenda", icon: Calendar },
  { id: "medications", name: "Medications", icon: Pill },
  { id: "crypto", name: "Crypto", icon: Coins },
  { id: "thermostat", name: "Thermostat", icon: Thermometer },
  { id: "alarm", name: "Alarm", icon: Shield },
  { id: "sprinkler", name: "Sprinkler", icon: Sprout },
  { id: "media", name: "Media", icon: Music },
  { id: "system", name: "System", icon: Monitor },
  { id: "settings", name: "Settings", icon: Settings },
];

export default function ClientLayout({ currentPage, children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Move all weather state inside component
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [theme, setTheme] = useState<Theme>("auto");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("desktop");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newsItems] = useState<NewsItem[]>([
    { id: "1", text: "System backup completed successfully", type: "info" },
    { id: "2", text: "Living room window has been open for 2 hours", type: "warning" },
    { id: "3", text: "Energy usage 15% below average today", type: "info" },
  ]);
  const [serverTime, setServerTime] = useState<Date>(new Date());

  // Move fetchWeather inside component
  const fetchServerTime = useCallback(async () => {
    try {
      const response = await fetch('/api/server-time');
      if (response.ok) {
        const data = await response.json();
        setServerTime(new Date(data.timestamp));
      }
    } catch (error) {
      console.error('Server time fetch failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchServerTime]);

  const fetchWeather = useCallback(async () => {
    setWeatherError(false);
    setWeather(null); // Start with null to show loading/offline
    
    const settings = weatherApiSettings.get();
    
    if (!settings.apiKey || !settings.provider || settings.location.lat === 0 || settings.provider === "ha_integration" || !settings.isConfigured) {
      // No config: stay null, will show "Offline" in UI
      setWeatherError(true); // Treat unconfigured as error/offline
      return;
    }

    try {
      let url = "";
      let temp = 0;
      let condition = "";
      let sunriseTime = "";
      let sunsetTime = "";

      switch (settings.provider) {
        case "openweathermap":
          url = `https://api.openweathermap.org/data/2.5/weather?lat=${settings.location.lat}&lon=${settings.location.lon}&appid=${settings.apiKey}&units=imperial`; // Force imperial
          break;
        case "weatherapi":
          url = `https://api.weatherapi.com/v1/current.json?key=${settings.apiKey}&q=${settings.location.lat},${settings.location.lon}`; // Always F available
          break;
        case "accuweather":
          if (!settings.location.locationKey) {
            throw new Error("Location key required for AccuWeather");
          }
          url = `https://dataservice.accuweather.com/currentconditions/v1/${settings.location.locationKey}?apikey=${settings.apiKey}&details=true`; // Always Imperial
          break;
        default:
          throw new Error("Unsupported weather provider");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Parse based on provider
      switch (settings.provider) {
        case "openweathermap":
          temp = Math.round(data.main.temp); // Now imperial/F
          condition = data.weather[0].description;
          const sunriseDate = new Date(data.sys.sunrise * 1000);
          const sunsetDate = new Date(data.sys.sunset * 1000);
          sunriseTime = sunriseDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          sunsetTime = sunsetDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          break;
        case "weatherapi":
          temp = Math.round(data.current.temp_f); // Force F
          condition = data.current.condition.text;
          sunriseTime = "6:42 AM"; // Placeholder - no sunrise/sunset in current endpoint
          sunsetTime = "7:18 PM"; // Placeholder
          break;
        case "accuweather":
          const accuData = Array.isArray(data) ? data[0] : data;
          temp = Math.round(accuData.Temperature.Imperial.Value); // F
          condition = accuData.WeatherText;
          sunriseTime = "6:42 AM"; // Would need separate astronomy call
          sunsetTime = "7:18 PM";
          break;
      }

      // On success, set real data (no mock fallback)
      setWeather({
        temperature: temp,
        condition,
        sunrise: sunriseTime,
        sunset: sunsetTime
      });
      setWeatherError(false);
    } catch (error) {
      console.error("Weather fetch failed:", error);
      setWeatherError(true);
      setWeather(null); // No fallback - stay null on error
      // No toast here to avoid spam
    }
  }, []); // No dependencies - settings are fetched inside

  // Fetch weather on mount and every 10 minutes
  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // Every 10 min
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Initialize display mode from localStorage or default
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDisplayMode = localStorage.getItem("displayMode") as DisplayMode;
      if (savedDisplayMode) {
        setDisplayMode(savedDisplayMode);
        document.documentElement.classList.add(`display-${savedDisplayMode}`);
      } else {
        document.documentElement.classList.add('display-desktop');
      }
    }
  }, []);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-collapse nav for mobile and tablet modes
  useEffect(() => {
    if (displayMode === "phone") {
      setIsNavCollapsed(true);
    } else if (displayMode === "tablet") {
      setIsNavCollapsed(false);
    }
  }, [displayMode]);

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Theme management
  const applyTheme = useCallback((theme: Theme) => {
    if (typeof document === "undefined") return;
    
    const root = document.documentElement;
    
    if (theme === "auto") {
      const now = new Date();
      let sunrise = new Date();
      let sunset = new Date();
      
      if (weather) {
        // Parse as before
        const [sunriseHour, sunriseMin] = weather.sunrise.replace(/[AP]M/, "").split(":").map(Number);
        const [sunsetHour, sunsetMin] = weather.sunset.replace(/[AP]M/, "").split(":").map(Number);
        
        sunrise.setHours(
          weather.sunrise.includes("PM") && sunriseHour !== 12 ? sunriseHour + 12 : sunriseHour,
          sunriseMin
        );
        sunset.setHours(
          weather.sunset.includes("PM") && sunsetHour !== 12 ? sunsetHour + 12 : sunsetHour,
          sunsetMin
        );
      } else {
        // Fallback times
        sunrise.setHours(6, 42);
        sunset.setHours(19, 18);
      }
      
      const isDaytime = now >= sunrise && now <= sunset;
      root.classList.toggle("dark", !isDaytime);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [weather]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const handleThemeChange = useCallback(() => {
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";
    setTheme(nextTheme);
    toast.success(`Theme changed to ${nextTheme}`);
  }, [theme]);

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        toast.success("Entered fullscreen mode");
      } else {
        await document.exitFullscreen();
        toast.success("Exited fullscreen mode");
      }
    } catch (error) {
      toast.error("Fullscreen not supported or failed");
    }
  }, []);

  const getThemeIcon = () => {
    switch (theme) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      case "auto": return <SunMoon className="h-4 w-4" />;
    }
  };

  const getDisplayModeIcon = () => {
    switch (displayMode) {
      case "tv": return <Tv className="h-4 w-4" />;
      case "desktop": return <Monitor className="h-4 w-4" />;
      case "tablet": return <Tablet className="h-4 w-4" />;
      case "phone": return <Smartphone className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  };

  // Get responsive layout classes based on display mode
  const getLayoutClasses = () => {
    switch (displayMode) {
      case "tv":
        return {
          header: "h-16",
          nav: isNavCollapsed ? 'w-20' : 'w-72',
          button: "h-14",
          text: "text-lg",
          padding: "p-8"
        };
      case "desktop":
        return {
          header: "h-14",
          nav: isNavCollapsed ? 'w-16' : 'w-64',
          button: "h-11",
          text: "text-base",
          padding: "p-6"
        };
      case "tablet":
        return {
          header: "h-16",
          nav: isNavCollapsed ? 'w-18' : 'w-56',
          button: "h-12",
          text: "text-base",
          padding: "p-4"
        };
      case "phone":
        return {
          header: "h-14",
          nav: 'w-16',
          button: "h-10",
          text: "text-sm",
          padding: "p-3"
        };
      default:
        return {
          header: "h-14",
          nav: isNavCollapsed ? 'w-16' : 'w-64',
          button: "h-11",
          text: "text-base",
          padding: "p-6"
        };
    }
  };

  const layout = getLayoutClasses();

  const handleNavClick = (id: string) => {
    const route = id === 'dashboard' ? '/' : `/${id}`;
    router.push(route);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors display-${displayMode}`}>
      {/* Fixed Header */}
      <header className={`sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 ${layout.header}`}>
        <div className={`flex items-center px-4 h-full ${layout.text}`}>
          {/* Navbar Toggle - Hidden on phone as nav is always collapsed */}
          {displayMode !== "phone" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}
              className="mr-2"
            >
              {isNavCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}

          {/* Time & Weather */}
          <div className={`flex items-center gap-4 ${displayMode === "phone" ? "flex-col gap-1" : ""}`}>
            <div className="font-medium">
              {formatTime(currentTime)}
            </div>
            {displayMode !== "phone" && (
              <div className="text-muted-foreground">
                {formatDate(currentTime)}
              </div>
            )}
            <div className="flex items-center gap-2">
              {weather ? (
                <>
                  <span>{weather.temperature}°</span>
                  <span className="text-muted-foreground text-xs capitalize">{weather.condition}</span>
                </>
              ) : weatherError ? (
                <span className="text-destructive text-xs">Offline</span>
              ) : (
                <span className="text-muted-foreground text-xs">Loading...</span>
              )}
            </div>
          </div>

          {/* News Ticker - Hidden on phone */}
          {displayMode !== "phone" && (
            <div className="flex-1 mx-6">
              <div className="relative overflow-hidden">
                <div className={`whitespace-nowrap animate-[scroll_${displayMode === "tv" ? "45s" : "30s"}_linear_infinite] hover:[animation-play-state:paused]`}>
                  {newsItems.map((item, index) => (
                    <span key={item.id} className="inline-flex items-center gap-2 mx-4">
                      <span className={`text-muted-foreground ${displayMode === "tv" ? "text-lg" : "text-sm"}`}>
                        {item.text}
                      </span>
                      {index < newsItems.length - 1 && (
                        <span className="text-muted-foreground">•</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Theme Toggle, Fullscreen Toggle & Display Mode Indicator */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="flex items-center gap-2"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="sr-only">{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleThemeChange}
              className="flex items-center gap-2"
            >
              {getThemeIcon()}
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            {/* Display Mode Indicator - Only show on desktop/tv */}
            {(displayMode === "desktop" || displayMode === "tv") && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {getDisplayModeIcon()}
                <span className="sr-only">Display mode: {displayMode}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Navigation Rail */}
        <nav className={`flex-shrink-0 border-r bg-card/50 backdrop-blur transition-all duration-300 ${layout.nav}`}>
          <ScrollArea className="h-full py-4">
            <div className="space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full transition-all duration-200 ${layout.button} ${
                      isNavCollapsed || displayMode === "phone"
                        ? 'justify-center px-0' 
                        : 'justify-start gap-3'
                    }`}
                    onClick={() => handleNavClick(item.id)}
                    title={(isNavCollapsed || displayMode === "phone") ? item.name : undefined}
                  >
                    <Icon className={`flex-shrink-0 ${displayMode === "tv" ? "h-6 w-6" : "h-5 w-5"}`} />
                    {!isNavCollapsed && displayMode !== "phone" && (
                      <span className={displayMode === "tv" ? "text-lg" : ""}>{item.name}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </nav>

        {/* Main Content Area - Wrapped with providers */}
        <main className="flex-1 overflow-y-auto">
          <div className={`container max-w-7xl mx-auto ${layout.padding}`}>
            <div className="grid grid-cols-1">
              <div className="space-y-6">
                <HomeAssistantProvider>
                  <ThermostatProvider>
                    {children}
                  </ThermostatProvider>
                </HomeAssistantProvider>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position={displayMode === "tv" ? "top-center" : "bottom-right"}
        toastOptions={{
          style: {
            fontSize: displayMode === "tv" ? "18px" : "14px"
          }
        }}
      />
    </div>
  );
}