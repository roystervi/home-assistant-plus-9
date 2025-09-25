"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

interface BackgroundContextType {
  customBgColor: string | null;
  setCustomBgColor: (color: string | null) => void;
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;
  backgroundMode: string;
  setBackgroundMode: (mode: string) => void;
  // Theme fields
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  resolvedTheme: "light" | "dark";
  mounted: boolean;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  // Theme state
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const setTheme = useCallback((newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
      setThemeState(savedTheme);
      setMounted(true);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document === "undefined" || !mounted) return;

    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.classList.remove("light", "dark");

      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      } else {
        root.classList.add(theme);
        setResolvedTheme(theme);
      }
    };

    applyTheme();

    const handleChange = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  // Background state
  const [customBgColor, setCustomBgColorState] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null);
  const [backgroundMode, setBackgroundModeState] = useState("default");

  const setCustomBgColor = useCallback((color: string | null) => {
    setCustomBgColorState(color);
    if (typeof window !== "undefined") {
      if (color) {
        localStorage.setItem("customBgColor", color);
      } else {
        localStorage.removeItem("customBgColor");
      }
    }
  }, []);

  const setBackgroundImage = useCallback((url: string | null) => {
    setBackgroundImageState(url);
    if (typeof window !== "undefined") {
      if (url) {
        localStorage.setItem("backgroundImage", url);
      } else {
        localStorage.removeItem("backgroundImage");
      }
    }
  }, []);

  const setBackgroundMode = useCallback((mode: string) => {
    setBackgroundModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("backgroundMode", mode);
    }
  }, []);

  // Load background from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedColor = localStorage.getItem("customBgColor");
      const savedImage = localStorage.getItem("backgroundImage");
      const savedMode = localStorage.getItem("backgroundMode") || "default";

      if (savedColor) setCustomBgColorState(savedColor);
      if (savedImage) setBackgroundImageState(savedImage);
      setBackgroundModeState(savedMode);
    }
  }, []);

  // Apply background styles
  useEffect(() => {
    if (typeof document !== "undefined") {
      const body = document.body;
      const root = document.documentElement;

      // Reset
      body.style.backgroundColor = "";
      body.style.backgroundImage = "";
      body.style.backgroundSize = "";
      body.style.backgroundPosition = "";
      body.style.backgroundRepeat = "";
      body.style.backgroundAttachment = "";
      root.style.setProperty("--color-background", "");

      if (backgroundMode === "default") {
        // Use theme default
      } else if (backgroundMode === "image" && backgroundImage) {
        body.style.backgroundColor = "transparent";
        body.style.backgroundImage = `url(${backgroundImage})`;
        body.style.backgroundSize = "cover";
        body.style.backgroundPosition = "center";
        body.style.backgroundRepeat = "no-repeat";
        body.style.backgroundAttachment = "fixed";
        root.style.setProperty("--color-background", "transparent");
      } else if (customBgColor) {
        body.style.backgroundColor = customBgColor;
        root.style.setProperty("--color-background", customBgColor);
      }
    }
  }, [backgroundMode, customBgColor, backgroundImage]);

  const value: BackgroundContextType = {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
    customBgColor,
    setCustomBgColor,
    backgroundImage,
    setBackgroundImage,
    backgroundMode,
    setBackgroundMode,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a BackgroundProvider");
  }
  return context;
}