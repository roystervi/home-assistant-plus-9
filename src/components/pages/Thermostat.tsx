// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: src/components/pages/Thermostat.tsx

"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ThermostatCard } from "@/components/ui/thermostat-card";
import { useThermostat } from "@/contexts/ThermostatContext";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Thermometer } from "lucide-react";

export default function Thermostat() {
  const { thermostats, updateTargetTemp, updateMode, isLoading, error } = useThermostat();

  const handleTargetTempChange = useCallback(
    async (entityId: string, newTemp: number) => {
      await updateTargetTemp(entityId, newTemp);
    },
    [updateTargetTemp]
  );

  const handleModeChange = useCallback(
    async (entityId: string, newMode: "auto" | "heat" | "cool" | "off") => {
      await updateMode(entityId, newMode);
    },
    [updateMode]
  );

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
            Climate Control
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your home's temperature and humidity settings
            {error && <span className="text-destructive"> • {error}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}
          <Badge variant="outline" className="flex items-center gap-2">
            <Thermometer className="h-3 w-3" />
            {thermostats.length} Thermostat{thermostats.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Thermostat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {thermostats.map((thermostat) => (
          <Card
            key={thermostat.entity_id}
            className="p-4 bg-white shadow-lg border-0 rounded-2xl h-full"
            style={{ minHeight: "250px" }}
          >
            <ThermostatCard
              entity_id={thermostat.entity_id}
              name={thermostat.name}
              current_temp={thermostat.current_temp}
              target_temp={thermostat.target_temp}
              humidity={thermostat.humidity}
              mode={thermostat.mode}
              hvac_action={thermostat.hvac_action}
              min_temp={thermostat.min_temp}
              max_temp={thermostat.max_temp}
              onTargetTempChange={(temp) =>
                handleTargetTempChange(thermostat.entity_id, temp)
              }
              onModeChange={(mode) =>
                handleModeChange(thermostat.entity_id, mode)
              }
              compact={true}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
