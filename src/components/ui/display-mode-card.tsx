"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Monitor, Tablet, Smartphone, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

export function DisplayModeCard() {
  const [displayMode, setDisplayMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("display_mode") || "auto"
    }
    return "auto"
  })

  const [currentSize, setCurrentSize] = useState("Desktop")
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      let size = "Mobile"
      if (w >= 1024) size = "Desktop"
      else if (w >= 640) size = "Tablet"
      setCurrentSize(size)
      setDimensions({ width: w, height: window.innerHeight })
    }

    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("display_mode", displayMode)
      // Apply display mode class to root
      document.documentElement.classList.remove("display-tv", "display-desktop", "display-tablet", "display-phone")
      document.documentElement.classList.add(`display-${displayMode === "auto" ? "desktop" : displayMode}`)
    }
  }, [displayMode])

  const modes = [
    { key: "auto", name: "Auto", desc: "Adapts to screen size", icon: Settings },
    { key: "desktop", name: "Desktop", desc: "Desktop layout", icon: Monitor },
    { key: "tablet", name: "Tablet", desc: "Tablet layout", icon: Tablet },
    { key: "mobile", name: "Mobile", desc: "Mobile layout", icon: Smartphone },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Display Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Current: {currentSize} ({dimensions.width}×{dimensions.height}px)
        </p>
        <div className="grid grid-cols-1 gap-3">
          {modes.map(({ key, name, desc, icon: Icon }) => (
            <div
              key={key}
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("display_mode", key)
                }
                setDisplayMode(key)
              }}
              className={`
                relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${displayMode === key ? "border-primary bg-primary/10 ring-1 ring-primary/50" : "border-border hover:border-accent hover:bg-accent/5"}
              `}
            >
              {displayMode === key && <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-primary" />}
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block">{name}</span>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}