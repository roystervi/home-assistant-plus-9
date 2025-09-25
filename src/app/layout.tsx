import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { HomeAssistantProvider } from '@/contexts/HomeAssistantContext'
import { ThermostatProvider } from '@/contexts/ThermostatContext'
import { Providers } from '@/components/providers'

import VisualEditsMessenger from "@/visual-edits/VisualEditsMessenger"
import ErrorReporter from "@/components/ErrorReporter"
import Script from "next/script"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Home Assistant Plus',
  description: 'Smart home dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <Toaster />
          {children}
        </Providers>
        <VisualEditsMessenger />
        <ErrorReporter />
        <Script src="https://unpkg.com/@dotcms/ui@latest/dist/dotcms-ui.js" />
      </body>
    </html>
  )
}