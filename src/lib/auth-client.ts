"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

export const authClient = createAuthClient({
   baseURL: "",
  fetchOptions: {
      credentials: 'include'
  }
});

type SessionData = ReturnType<typeof authClient.useSession>

export const useSession = authClient.useSession;