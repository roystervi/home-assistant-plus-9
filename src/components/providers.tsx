"use client"

import { ThemeProvider } from "next-themes"
import { BackgroundProvider } from "./theme-provider"
import { ReactNode } from "react"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      disableTransitionOnChange
    >
      <BackgroundProvider>
        {children}
      </BackgroundProvider>
    </ThemeProvider>
  )
}