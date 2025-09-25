"use client"

import { createAuthClient } from "better-auth/client";
import { useSession } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const useSession = authClient.useSession;