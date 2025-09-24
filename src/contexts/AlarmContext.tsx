"use client";
import React, { createContext, useContext } from "react";

export type AlarmContextValue = {
  trigger: () => void;
};

export const AlarmContext = createContext<AlarmContextValue | null>(null);

export const AlarmProvider = ({ children }: { children: React.ReactNode }) => {
  const trigger = () => {
    // Placeholder for future alarm logic
    console.log("Alarm triggered");
  };

  return (
    <AlarmContext.Provider value={{ trigger }}>
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarm = (): AlarmContextValue => {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error("useAlarm must be used within AlarmProvider");
  }
  return context;
};