"use client"

import { ThemeProvider } from "next-themes"
import { BackgroundProvider } from "./theme-provider"
import { ReactNode } from "react"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <BackgroundProvider>
        <ThemeProvider>
          <ModeToggle />
          {children}
        </ThemeProvider>
      </BackgroundProvider>
    </>
  )
}