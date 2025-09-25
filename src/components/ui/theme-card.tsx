import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Theme } from "@/components/theme-provider"
import { Sun, Moon, SunMoon, CheckCircle, Settings } from "lucide-react"

export function ThemeCard() {
  const { theme, setTheme } = useTheme()

  const modes = [
    { key: "light", name: "Light", icon: Sun, desc: "Light theme" },
    { key: "dark", name: "Dark", icon: Moon, desc: "Dark theme" },
    { key: "auto", name: "Auto", icon: SunMoon, desc: "System preference" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          Theme Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Current: {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {modes.map(({ key, name, desc, icon: Icon }) => (
            <div
              key={key}
              onClick={() => setTheme(key as Theme)}
              className={`
                relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${theme === key ? "border-primary bg-primary/10 ring-1 ring-primary/50" : "border-border hover:border-accent hover:bg-accent/5"}
              `}
            >
              {theme === key && <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-primary" />}
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