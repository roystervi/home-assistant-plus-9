import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { HomeAssistantProvider } from '@/contexts/HomeAssistantContext'
import { ThermostatProvider } from '@/contexts/ThermostatContext'

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
        <HomeAssistantProvider>
          <ThermostatProvider>
            {children}
          </ThermostatProvider>
        </HomeAssistantProvider>
        <Toaster />
      </body>
    </html>
  )
}