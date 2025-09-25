"use client"

import React, { useState, useEffect, useCallback } from "react"
import { CheckCircle, RotateCw, Palette, Image as ImageIcon, Upload, Link, Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth-client"

import { useTheme } from "@/components/theme-provider"

const backgroundOptions = [
  { id: "default", name: "Default", description: "Theme-based colors", icon: Settings },
  { id: "dark-blue", name: "Dark Blue", color: "#1e40af", description: "Deep blue background" },
  { id: "dark-purple", name: "Dark Purple", color: "#7c3aed", description: "Rich purple background" },
  { id: "dark-green", name: "Dark Green", color: "#059669", description: "Forest green background" },
  { id: "dark-red", name: "Dark Red", color: "#dc2626", description: "Deep red background" },
  { id: "charcoal", name: "Charcoal", color: "#374151", description: "Dark gray background" },
  { id: "navy", name: "Navy", color: "#1e293b", description: "Dark navy background" },
  { id: "deep-teal", name: "Deep Teal", color: "#0f766e", description: "Deep teal background" },
  { id: "color-custom", name: "Custom Color", description: "Choose your own color", icon: Palette },
  { id: "image", name: "Custom Image", description: "Upload or link background image", icon: ImageIcon }
]

type BackgroundMode = (typeof backgroundOptions)[number]["id"]

export function BackgroundColorCard() {
  const { 
    customBgColor, 
    setCustomBgColor, 
    setTheme, 
    backgroundImage, 
    setBackgroundImage,
    backgroundMode,
    setBackgroundMode,
    saveBackgroundSettings,
    isSaving
  } = useTheme()

  const { data: session } = useSession();

  const [imageMode, setImageMode] = useState<"upload" | "url">("upload")
  
  const [imageUrl, setImageUrl] = useState("")
  
  const [filePreview, setFilePreview] = useState<string | null>(backgroundImage)
  
  const [colorMessage, setColorMessage] = useState("")
  
  // Only sync filePreview with backgroundImage when not caused by user actions
  useEffect(() => {
    setFilePreview(backgroundImage)
  }, [backgroundImage])

  useEffect(() => {
    const opt = backgroundOptions.find(o => o.id === backgroundMode)
    if (opt?.color && customBgColor !== opt.color) {
      setCustomBgColor(opt.color)
    } else if (backgroundMode === "default" && customBgColor !== null) {
      setCustomBgColor(null)
    } else if (backgroundMode === "image" && customBgColor !== null) {
      setCustomBgColor(null)
    }
  }, [backgroundMode])

  const handleBackgroundModeChange = useCallback((mode: BackgroundMode) => {
    let message = ""
    const predefinedColors = {
      "dark-blue": "#1e40af",
      "dark-purple": "#7c3aed",
      "dark-green": "#059669",
      "dark-red": "#dc2626",
      "charcoal": "#374151",
      "navy": "#1e293b",
      "deep-teal": "#0f766e",
    } as const
    
    if (mode === "default") {
      setBackgroundMode("default")
      setCustomBgColor(null)
      setBackgroundImage(null)
      setTheme('light')
      message = "Background reset to theme default"
    } else if (predefinedColors[mode as keyof typeof predefinedColors]) {
      setBackgroundMode(mode)
      setCustomBgColor(predefinedColors[mode as keyof typeof predefinedColors])
      setBackgroundImage(null)
      setTheme("dark")
      const optName = backgroundOptions.find(o => o.id === mode)?.name
      message = `Background changed to ${optName}`
    } else if (mode === "color-custom") {
      setBackgroundMode(mode)
      setTheme("dark")
      message = "Custom color mode selected"
    } else if (mode === "image") {
      setBackgroundMode(mode)
      setCustomBgColor(null)
      setTheme("dark")
      message = "Custom image mode selected"
    }
    
    setColorMessage(message)
    setTimeout(() => setColorMessage(""), 3000)
  }, [setBackgroundMode, setCustomBgColor, setBackgroundImage, setTheme])

  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance > 0.5
  }

  const handleCustomColorChange = useCallback((color: string) => {
    setCustomBgColor(color)
    // Set theme based on color luminance
    const light = isLightColor(color)
    setTheme(light ? 'light' : 'dark')
    setColorMessage(`Custom color updated to ${light ? 'light' : 'dark'} theme`)
    setTimeout(() => setColorMessage(""), 3000)
  }, [setCustomBgColor, setTheme])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Support image formats and GIF
      if (file.type.startsWith('image/') || file.type === 'image/gif') {
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64 = event.target?.result as string
          setFilePreview(base64)
          setImageUrl(base64)
          setBackgroundImage(base64)
          setColorMessage(`Image uploaded: ${file.name}`)
          setTimeout(() => setColorMessage(""), 3000)
        }
        reader.readAsDataURL(file)
      } else {
        setColorMessage("Please select an image or GIF file")
        setTimeout(() => setColorMessage(""), 3000)
      }
    }
  }, [setBackgroundImage])

  const handleImageUrlChange = useCallback((url: string) => {
    setFilePreview(url)
    setImageUrl(url)
    setBackgroundImage(url)
    setColorMessage("Image URL set")
    setTimeout(() => setColorMessage(""), 3000)
  }, [setBackgroundImage])

  const resetAppearanceSettings = useCallback(() => {
    setBackgroundMode("default")
    setCustomBgColor(null)
    setBackgroundImage(null)
    setImageUrl("")
    setFilePreview(null)
    setColorMessage("All appearance settings reset to default")
    setTimeout(() => setColorMessage(""), 3000)
  }, [setBackgroundMode, setCustomBgColor, setBackgroundImage])

  const currentOption = backgroundOptions.find(opt => opt.id === backgroundMode)
  const isImageMode = backgroundMode === "image"
  const isColorCustomMode = backgroundMode === "color-custom"
  const currentDisplay = backgroundMode === "default" 
    ? "Theme default"
    : isColorCustomMode 
    ? customBgColor?.toUpperCase()
    : isImageMode 
    ? (filePreview ? "Custom Image" : "No image")
    : currentOption?.name

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Background Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Current: {currentDisplay}</p>
        {colorMessage && (
          <div className={`mb-4 p-3 rounded-lg border-l-4 ${
            colorMessage.includes("reset") || colorMessage.includes("default")
              ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950 dark:border-blue-500 dark:text-blue-400"
              : "bg-green-50 border-green-500 text-green-700 dark:bg-green-950 dark:border-green-500 dark:text-green-400"
          }`}>
            <span className="text-sm">{colorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {backgroundOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleBackgroundModeChange(option.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${backgroundMode === option.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                  : "border-border hover:border-accent hover:bg-accent/5"
                }
              `}
            >
              <div className="flex items-center space-x-3 mb-2">
                {option.color ? (
                  <div
                    className="w-6 h-6 rounded-full border-2 border-border shadow-inner"
                    style={{ backgroundColor: option.color }}
                  />
                ) : option.icon ? (
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-border bg-gradient-to-br from-muted to-accent/50" />
                )}
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {option.name}
                  </span>
                  {backgroundMode === option.id && (
                    <CheckCircle size={16} className="text-primary" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          ))}
        </div>

        {isColorCustomMode && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-accent/30">
            <label className="block text-sm font-medium text-foreground mb-3">
              Custom Color Picker
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customBgColor || "#1f2937"}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-border"
                title="Pick a custom background color"
              />
              <div className="flex-1">
                <div className="text-foreground font-mono text-lg font-bold mb-1">
                  {(customBgColor || "#1f2937").toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Click the color square to open the color picker
                </div>
              </div>
            </div>
          </div>
        )}

        {isImageMode && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-accent/30 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              <label className="text-sm font-medium text-foreground">Custom Background Image</label>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  imageMode === "upload"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-accent"
                }`}
              >
                <Upload className="h-4 w-4 mx-auto mb-1" />
                <span className="text-xs font-medium">Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex-1 p-3 rounded-lg border transition-colors ${
                  imageMode === "url"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-accent"
                }`}
              >
                <Link className="h-4 w-4 mx-auto mb-1" />
                <span className="text-xs font-medium">Image URL</span>
              </button>
            </div>

            {imageMode === "upload" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Select image or GIF file (JPG, PNG, GIF supported)
                </label>
                <input
                  type="file"
                  accept="image/*,.gif"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80"
                />
              </div>
            )}

            {imageMode === "url" && (
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Enter direct image URL (supports GIF for animation)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value)
                    if (e.target.value) {
                      setFilePreview(e.target.value)
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  onBlur={() => {
                    if (imageUrl) {
                      handleImageUrlChange(imageUrl)
                    }
                  }}
                />
              </div>
            )}

            {filePreview && (
              <div className="relative">
                <div className="w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={filePreview}
                    alt="Background preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Preview (scaled down)</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={resetAppearanceSettings}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors w-full justify-center"
        >
          <RotateCw size={14} />
          <span>Reset All</span>
        </button>

        {/* Save Button - Only show if changes made or not default */}
        { (backgroundMode !== "default" || customBgColor || backgroundImage) && (
          <Button
            onClick={saveBackgroundSettings}
            disabled={isSaving || !session}
            className="w-full mt-4"
            variant={isSaving ? "default" : "default"}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              "Save to Account"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}