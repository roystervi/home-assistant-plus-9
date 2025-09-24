"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useTheme as useNextTheme } from "next-themes"

type BackgroundContextType = {
  customBgColor: string | null
  setCustomBgColor: (color: string | null) => void
  backgroundImage: string | null
  setBackgroundImage: (url: string | null) => void
  backgroundMode: string
  setBackgroundMode: (mode: string) => void
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined)

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [customBgColor, setCustomBgColorState] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null)
  const [backgroundMode, setBackgroundModeState] = useState("default")

  const setCustomBgColor: BackgroundContextType["setCustomBgColor"] = (color) => {
    setCustomBgColorState(color)
    if (typeof window !== "undefined") {
      if (color) {
        localStorage.setItem("customBgColor", color)
      } else {
        localStorage.removeItem("customBgColor")
      }
    }
  }

  const setBackgroundImage: BackgroundContextType["setBackgroundImage"] = (url) => {
    setBackgroundImageState(url)
    if (typeof window !== "undefined") {
      if (url) {
        localStorage.setItem("backgroundImage", url)
      } else {
        localStorage.removeItem("backgroundImage")
      }
    }
  }

  const setBackgroundMode: BackgroundContextType["setBackgroundMode"] = (mode) => {
    setBackgroundModeState(mode)
    if (typeof window !== "undefined") {
      localStorage.setItem("backgroundMode", mode)
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedColor = localStorage.getItem("customBgColor")
      const savedImage = localStorage.getItem("backgroundImage")
      const savedMode = localStorage.getItem("backgroundMode") || "default"

      if (savedColor) setCustomBgColorState(savedColor)
      if (savedImage) setBackgroundImageState(savedImage)
      setBackgroundModeState(savedMode)
    }
  }, [])

  // Apply styles
  useEffect(() => {
    if (typeof document !== "undefined") {
      const body = document.body
      const root = document.documentElement

      // Reset
      body.style.backgroundColor = ""
      body.style.backgroundImage = ""
      body.style.backgroundSize = ""
      body.style.backgroundPosition = ""
      body.style.backgroundRepeat = ""
      body.style.backgroundAttachment = ""
      root.style.setProperty("--color-background", "")

      if (backgroundMode === "default") {
        // Use theme default
      } else if (backgroundMode === "image" && backgroundImage) {
        body.style.backgroundColor = "transparent"
        body.style.backgroundImage = `url(${backgroundImage})`
        body.style.backgroundSize = "cover"
        body.style.backgroundPosition = "center"
        body.style.backgroundRepeat = "no-repeat"
        body.style.backgroundAttachment = "fixed"
        root.style.setProperty("--color-background", "transparent")
      } else if (customBgColor) {
        body.style.backgroundColor = customBgColor
        root.style.setProperty("--color-background", customBgColor)
      }
    }
  }, [backgroundMode, customBgColor, backgroundImage])

  const value: BackgroundContextType = {
    customBgColor,
    setCustomBgColor,
    backgroundImage,
    setBackgroundImage,
    backgroundMode,
    setBackgroundMode
  }

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackground() {
  const context = useContext(BackgroundContext)
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider")
  }
  return context
}

export function useTheme() {
  const next = useNextTheme()
  const bg = useBackground()
  return {
    ...next,
    ...bg
  }
}