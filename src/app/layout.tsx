import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { HomeAssistantProvider } from '@/contexts/HomeAssistantContext'
import { ThermostatProvider } from '@/contexts/ThermostatContext'
import { NextThemesProvider } from "next-themes"
import { BackgroundProvider } from "@/components/theme-provider"

import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
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
    <html lang="en">
      <body className={inter.className}>
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
          <BackgroundProvider>
            <HomeAssistantProvider>
              <ThermostatProvider>
                {children}
              </ThermostatProvider>
            </HomeAssistantProvider>
          </BackgroundProvider>
        </NextThemesProvider>
        <Toaster />
      
        <VisualEditsMessenger />
      </body>
    </html>
  )
}