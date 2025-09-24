"use client";
import React, { useState } from "react";
import { Thermometer } from "lucide-react";

export default function Thermostat() {
  const [temperature, setTemperature] = useState(22);

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      <Thermometer className="w-5 h-5 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{temperature}°C</span>
    </div>
  );
}