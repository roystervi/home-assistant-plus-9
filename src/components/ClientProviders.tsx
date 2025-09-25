"use client"

import { ReactNode } from "react"
import { BackgroundProvider } from "@/components/theme-provider"

interface ClientProvidersProps {
  children: ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <BackgroundProvider>
      {children}
    </BackgroundProvider>
  )
}