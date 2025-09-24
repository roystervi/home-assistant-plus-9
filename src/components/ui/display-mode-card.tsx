"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Tablet, Smartphone, CheckCircle, Tv } from "lucide-react"
import { useState, useEffect } from "react"

export function DisplayModeCard() {
  const [displayMode, setDisplayMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("displayMode") || "desktop"
    }
    return "desktop"
  })

  const [currentSize, setCurrentSize] = useState("Desktop")
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      let size = "Phone"
      if (w >= 1024) size = "Desktop"
      else if (w >= 768) size = "Tablet"
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
      localStorage.setItem("displayMode", displayMode)
      document.documentElement.classList.remove('display-tv', 'display-desktop', 'display-tablet', 'display-phone')
      document.documentElement.classList.add(`display-${displayMode}`)
    }
  }, [displayMode])

  const modes = [
    { key: "tv", name: "TV", desc: "Large screen layout", icon: Tv },
    { key: "desktop", name: "Desktop", desc: "Standard desktop layout", icon: Monitor },
    { key: "tablet", name: "Tablet", desc: "Tablet optimized layout", icon: Tablet },
    { key: "phone", name: "Phone", desc: "Mobile layout", icon: Smartphone },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
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
              onClick={() => setDisplayMode(key)}
              className={`
                relative p-3 rounded-md border cursor-pointer transition-colors
                ${displayMode === key ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}
              `}
            >
              {displayMode === key && <CheckCircle size={16} className="absolute top-3 right-3 text-primary" />}
              <div className="flex items-start gap-3">
                <Icon size={20} className="flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block">{name}</span>
                  <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}