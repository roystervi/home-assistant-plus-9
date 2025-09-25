"use client"

import { authClient } from "@/lib/auth-client"
import { ReactNode } from "react"

export function AuthProvider({ children }: { children: ReactNode }) {
  return <authClient.Provider>{children}</authClient.Provider>
}