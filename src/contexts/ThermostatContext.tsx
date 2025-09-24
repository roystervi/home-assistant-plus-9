"use client";
import React, { createContext, useContext } from "react";

type ThermostatContextValue = Record<string, never>;
const ThermostatContext = createContext<ThermostatContextValue>({});

export const ThermostatProvider = ({ children }: { children: React.ReactNode }) => {
  return <ThermostatContext.Provider value={{}}>{children}</ThermostatContext.Provider>;
};

export const useThermostat = () => useContext(ThermostatContext);