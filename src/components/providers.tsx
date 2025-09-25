"use client"

import { ThemeProvider } from "next-themes"
import { BackgroundProvider } from "./theme-provider"
import { ReactNode } from "react"
import dynamic from "next/dynamic";

const ThemeProvider = dynamic(
  () => import("@/components/theme-provider").then((mod) => ({ default: mod.ThemeProvider })),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <BackgroundProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </BackgroundProvider>
      </body>
    </html>
  )
}