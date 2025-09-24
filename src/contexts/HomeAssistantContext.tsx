"use client";
import React, { createContext, useContext } from "react";

type HomeAssistantContextValue = Record<string, never>;
const HomeAssistantContext = createContext<HomeAssistantContextValue>({});

export const HomeAssistantProvider = ({ children }: { children: React.ReactNode }) => {
  return <HomeAssistantContext.Provider value={{}}>{children}</HomeAssistantContext.Provider>;
};

export const useHomeAssistant = () => useContext(HomeAssistantContext);