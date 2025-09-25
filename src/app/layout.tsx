import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { HomeAssistantProvider } from '@/contexts/HomeAssistantContext'
import { ThermostatProvider } from '@/contexts/ThermostatContext'

import VisualEditsMessenger from "@/visual-edits/VisualEditsMessenger"
import ErrorReporter from "@/components/ErrorReporter"
import Script from "next/script"
import ClientProviders from "@/components/ClientProviders"

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
        <ClientProviders>
          <HomeAssistantProvider>
            <ThermostatProvider>
              <Toaster />
              {children}
            </ThermostatProvider>
          </HomeAssistantProvider>
        </ClientProviders>
        <VisualEditsMessenger />
        <ErrorReporter />
        <Script src="https://unpkg.com/@dotcms/ui@latest/dist/dotcms-ui.js" />
      </body>
    </html>
  )
}