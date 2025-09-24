// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/ui/thermostat-card.tsx

"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Snowflake, Wind, Droplets } from 'lucide-react';

interface ThermostatCardProps {
  entity_id: string;
  name?: string;
  current_temp: number;
  target_temp: number;
  humidity: number;
  mode: 'auto' | 'heat' | 'cool' | 'off';
  hvac_action: 'idle' | 'heating' | 'cooling' | 'off';
  min_temp?: number;
  max_temp?: number;
  onTargetTempChange?: (temp: number) => void;
  compact?: boolean; // NEW: Compact mode prop
}

export const ThermostatCard = ({
  entity_id,
  name = "Thermostat",
  current_temp,
  target_temp,
  humidity,
  mode,
  hvac_action,
  min_temp = 45,
  max_temp = 90,
  onTargetTempChange,
  compact = false // NEW: Default to false for backward compatibility
}: ThermostatCardProps) => {
  const [localTargetTemp, setLocalTargetTemp] = useState(target_temp);
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<SVGSVGElement>(null);

  const handleTempChange = useCallback((newTemp: number) => {
    const clampedTemp = Math.min(Math.max(newTemp, min_temp), max_temp);
    setLocalTargetTemp(clampedTemp);
    onTargetTempChange?.(clampedTemp);
  }, [min_temp, max_temp, onTargetTempChange]);

  const handleQuickAdjust = useCallback((delta: number) => {
    handleTempChange(localTargetTemp + delta);
  }, [localTargetTemp, handleTempChange]);

  const getTemperatureAngle = useCallback((temp: number) => {
    const range = max_temp - min_temp;
    const progress = (temp - min_temp) / range;
    return progress * 270 - 135; // -135° to 135° (270° total)
  }, [min_temp, max_temp]);

  const getTemperatureFromAngle = useCallback((angle: number) => {
    const normalizedAngle = (angle + 135) / 270; // Convert to 0-1 range
    return min_temp + (normalizedAngle * (max_temp - min_temp));
  }, [min_temp, max_temp]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Normalize angle to -135° to 135° range
    if (angle < -135) angle = -135;
    if (angle > 135) angle = 135;
    
    const newTemp = getTemperatureFromAngle(angle);
    handleTempChange(Math.round(newTemp));
  }, [isDragging, getTemperatureFromAngle, handleTempChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const currentTempAngle = getTemperatureAngle(current_temp);
  const targetTempAngle = getTemperatureAngle(localTargetTemp);

  const getModeIcon = () => {
    switch (mode) {
      case 'cool':
        return <Snowflake className={compact ? "w-3 h-3" : "w-4 h-4"} />;
      case 'heat':
        return <Wind className={compact ? "w-3 h-3" : "w-4 h-4"} />;
      default:
        return <Wind className={compact ? "w-3 h-3" : "w-4 h-4"} />;
    }
  };

  const getHvacStatusColor = () => {
    switch (hvac_action) {
      case 'heating':
        return 'text-orange-600 bg-orange-50';
      case 'cooling':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Compact layout - perfectly matching alarm panel design
  if (compact) {
    return (
      <div className="w-full h-full">
        {/* Main Housing - EXACTLY matching alarm panel style */}
        <div 
          className="w-full h-full p-3 flex items-center justify-between"
          style={{
            background: 'linear-gradient(145deg, #f7f4ed, #ede8dc)',
            border: '2px solid #d4c5a0',
            borderRadius: '12px',
            boxShadow: `
              4px 4px 12px rgba(0,0,0,0.1),
              -2px -2px 8px rgba(255,255,255,0.9),
              inset 1px 1px 2px rgba(255,255,255,0.8),
              inset -1px -1px 2px rgba(0,0,0,0.05)
            `
          }}
        >
          {/* Left: Thermostat Dial with alarm panel styling */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Outer Ring - Enhanced 3D matching alarm panel */}
              <div 
                className="absolute inset-0 w-32 h-32 rounded-full" 
                style={{
                  background: 'linear-gradient(145deg, #e5e7eb, #d1d5db)',
                  boxShadow: `
                    4px 4px 10px rgba(0,0,0,0.15),
                    -2px -2px 8px rgba(255,255,255,0.9),
                    inset 1px 1px 2px rgba(255,255,255,0.8),
                    inset -1px -1px 2px rgba(0,0,0,0.1)
                  `,
                  border: '2px solid #d4c5a0'
                }}
              />
              
              {/* Main Dial - Dark LCD style matching alarm display */}
              <div 
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #0f1419, #1a2b3d)',
                  boxShadow: `
                    inset 4px 4px 8px rgba(0,0,0,0.6),
                    inset -2px -2px 6px rgba(255,255,255,0.05),
                    2px 2px 6px rgba(0,0,0,0.3)
                  `,
                  border: '2px solid #2D3748'
                }}
              >
                
                {/* Temperature Ring SVG */}
                <svg
                  ref={dialRef}
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 112 112"
                >
                  {/* Tick marks */}
                  {Array.from({ length: 19 }, (_, i) => {
                    const angle = -135 + (i * 15);
                    const isMainTick = i % 3 === 0;
                    const radius = isMainTick ? 50 : 52;
                    const innerRadius = isMainTick ? 44 : 47;
                    
                    const x1 = 56 + radius * Math.cos(angle * Math.PI / 180);
                    const y1 = 56 + radius * Math.sin(angle * Math.PI / 180);
                    const x2 = 56 + innerRadius * Math.cos(angle * Math.PI / 180);
                    const y2 = 56 + innerRadius * Math.sin(angle * Math.PI / 180);
                    
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#9ca3af"
                        strokeWidth={isMainTick ? "1.2" : "0.7"}
                        className="opacity-60"
                      />
                    );
                  })}

                  {/* Temperature Ring */}
                  <defs>
                    <linearGradient id="tempRingCompact" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="30%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="70%" stopColor="#eab308" />
                      <stop offset="85%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  
                  <circle
                    cx="56"
                    cy="56"
                    r="50"
                    fill="none"
                    stroke="url(#tempRingCompact)"
                    strokeWidth="4"
                    strokeDasharray="236" 
                    strokeDashoffset="47"
                    strokeLinecap="round"
                    className="opacity-90"
                    style={{ transform: 'rotate(-135deg)', transformOrigin: '56px 56px' }}
                  />
                  
                  {/* Target Temperature Indicator - Enhanced glow */}
                  <circle
                    cx={56 + 50 * Math.cos(targetTempAngle * Math.PI / 180)}
                    cy={56 + 50 * Math.sin(targetTempAngle * Math.PI / 180)}
                    r="4"
                    fill="#eab308"
                    stroke="white"
                    strokeWidth="1.5"
                    className="cursor-pointer drop-shadow-lg"
                    onMouseDown={() => setIsDragging(true)}
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(234, 179, 8, 0.8))'
                    }}
                  />
                </svg>

                {/* Center Content - Green LCD style EXACTLY like alarm panel */}
                <div className="relative z-10 text-center">
                  <div 
                    className="text-2xl font-bold text-green-400 leading-none font-mono"
                    style={{ textShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                  >
                    {current_temp}°
                  </div>
                  <div 
                    className="text-xs font-medium text-green-400 leading-none mt-1 font-mono"
                    style={{ textShadow: '0 0 3px rgba(34, 197, 94, 0.5)' }}
                  >
                    CURRENT
                  </div>
                  <div 
                    className="text-lg font-bold text-green-400 leading-none mt-2 font-mono"
                    style={{ textShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                  >
                    {localTargetTemp}°
                  </div>
                  <div 
                    className="text-xs font-medium text-green-400 leading-none font-mono"
                    style={{ textShadow: '0 0 3px rgba(34, 197, 94, 0.5)' }}
                  >
                    TARGET
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Status Indicators - EXACTLY matching alarm panel button style */}
          <div className="flex flex-col items-center gap-3 px-4">
            {/* Mode Display - EXACT alarm panel button styling */}
            <button
              className="relative select-none cursor-pointer text-green-800 font-semibold text-sm transition-all duration-120 ease-out border-2 border-green-400 rounded-lg px-4 py-2 flex items-center gap-2 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(145deg, #dcfce7, #bbf7d0)',
                boxShadow: '4px 4px 10px rgba(34, 197, 94, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(34, 197, 94, 0.1)',
                textShadow: '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(34, 197, 94, 0.2)',
                borderColor: '#86efac'
              }}
            >
              {getModeIcon()}
              <span className="capitalize">{mode}</span>
            </button>

            {/* HVAC Status - EXACT alarm panel button styling */}
            <button
              className={`relative select-none cursor-pointer font-semibold text-sm transition-all duration-120 ease-out border-2 rounded-lg px-4 py-2 flex items-center gap-2 hover:scale-[1.02] ${
                hvac_action === 'heating' ? 'text-red-800 border-red-400' :
                hvac_action === 'cooling' ? 'text-blue-800 border-blue-400' :
                'text-gray-800 border-gray-400'
              }`}
              style={{
                background: hvac_action === 'heating' 
                  ? 'linear-gradient(145deg, #fee2e2, #fecaca)'
                  : hvac_action === 'cooling'
                  ? 'linear-gradient(145deg, #dbeafe, #bfdbfe)'
                  : 'linear-gradient(145deg, #f9fafb, #e5e7eb)',
                boxShadow: hvac_action === 'heating'
                  ? '4px 4px 10px rgba(239, 68, 68, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(239, 68, 68, 0.1)'
                  : hvac_action === 'cooling'
                  ? '4px 4px 10px rgba(59, 130, 246, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(59, 130, 246, 0.1)'
                  : '4px 4px 10px rgba(0,0,0,0.15), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1)',
                textShadow: '0px 1px 1px rgba(255,255,255,0.9)',
                borderColor: hvac_action === 'heating' ? '#fca5a5' : hvac_action === 'cooling' ? '#93c5fd' : '#d1d5db'
              }}
            >
              <Wind className="w-4 h-4" />
              <span className="capitalize">{hvac_action}</span>
            </button>

            {/* Humidity Display - EXACT alarm panel button styling */}
            <button
              className="relative select-none cursor-pointer text-blue-800 font-semibold text-sm transition-all duration-120 ease-out border-2 border-blue-400 rounded-lg px-4 py-2 flex items-center gap-2 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(145deg, #dbeafe, #bfdbfe)',
                boxShadow: '4px 4px 10px rgba(59, 130, 246, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(59, 130, 246, 0.1)',
                textShadow: '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(59, 130, 246, 0.2)',
                borderColor: '#93c5fd'
              }}
            >
              <Droplets className="w-4 h-4" />
              <span>{humidity}%</span>
            </button>
          </div>

          {/* Right: Control Buttons - EXACT alarm panel styling */}
          <div className="flex flex-col gap-3">
            {/* Temperature Down Button - EXACT alarm panel styling */}
            <button
              className="relative select-none cursor-pointer text-blue-800 font-bold text-sm transition-all duration-120 ease-out border-2 border-blue-400 rounded-lg h-10 px-4 flex items-center gap-2 hover:scale-[1.02]"
              onClick={() => handleQuickAdjust(-1)}
              style={{
                background: 'linear-gradient(145deg, #dbeafe, #bfdbfe)',
                boxShadow: '4px 4px 10px rgba(59, 130, 246, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(59, 130, 246, 0.1)',
                textShadow: '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(59, 130, 246, 0.2)',
                borderColor: '#93c5fd'
              }}
            >
              <Snowflake className="w-4 h-4" />
              -1°
            </button>

            {/* Temperature Up Button - EXACT alarm panel styling */}
            <button
              className="relative select-none cursor-pointer text-red-800 font-bold text-sm transition-all duration-120 ease-out border-2 border-red-400 rounded-lg h-10 px-4 flex items-center gap-2 hover:scale-[1.02]"
              onClick={() => handleQuickAdjust(1)}
              style={{
                background: 'linear-gradient(145deg, #fee2e2, #fecaca)',
                boxShadow: '4px 4px 10px rgba(239, 68, 68, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(239, 68, 68, 0.1)',
                textShadow: '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(239, 68, 68, 0.2)',
                borderColor: '#fca5a5'
              }}
            >
              <Wind className="w-4 h-4" />
              +1°
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original full-size layout (unchanged)
  return (
    <div className="flex items-center justify-between">
      {/* Thermostat Dial Section */}
      <div className="relative flex flex-col items-center">
        {/* Main Dial Container */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 w-48 h-48 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl"></div>
          
          {/* Main Dial Background */}
          <div className="relative w-44 h-44 rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-inner flex items-center justify-center">
            
            {/* Temperature Ring SVG */}
            <svg
              ref={dialRef}
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 176 176"
            >
              {/* Tick Marks */}
              {Array.from({ length: 37 }, (_, i) => {
                const angle = -135 + (i * 7.3); // 270° / 37 marks
                const isMainTick = i % 6 === 0; // Major ticks every 6 positions
                const radius = isMainTick ? 75 : 78;
                const innerRadius = isMainTick ? 65 : 70;
                
                const x1 = 88 + radius * Math.cos(angle * Math.PI / 180);
                const y1 = 88 + radius * Math.sin(angle * Math.PI / 180);
                const x2 = 88 + innerRadius * Math.cos(angle * Math.PI / 180);
                const y2 = 88 + innerRadius * Math.sin(angle * Math.PI / 180);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#94a3b8"
                    strokeWidth={isMainTick ? "1.5" : "0.8"}
                    className="opacity-60"
                  />
                );
              })}

              {/* Temperature Gradient Arc */}
              <defs>
                <linearGradient id="tempRing" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="30%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="70%" stopColor="#eab308" />
                  <stop offset="85%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              
              <circle
                cx="88"
                cy="88"
                r="80"
                fill="none"
                stroke="url(#tempRing)"
                strokeWidth="6"
                strokeDasharray="377" 
                strokeDashoffset="75"
                strokeLinecap="round"
                className="opacity-90"
                style={{ transform: 'rotate(-135deg)', transformOrigin: '88px 88px' }}
              />
              
              {/* Target Temperature Indicator */}
              <circle
                cx={88 + 80 * Math.cos(targetTempAngle * Math.PI / 180)}
                cy={88 + 80 * Math.sin(targetTempAngle * Math.PI / 180)}
                r="6"
                fill="#eab308"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer drop-shadow-lg"
                onMouseDown={() => setIsDragging(true)}
              />
            </svg>

            {/* Center Content */}
            <div className="relative z-10 text-center">
              <div className="text-5xl font-bold text-yellow-500 leading-none mb-1">
                {Math.round(current_temp)}°
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                CURRENT
              </div>
              <div className="text-3xl font-bold text-yellow-500 leading-none">
                {Math.round(localTargetTemp)}°
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                TARGET
              </div>
            </div>
          </div>
        </div>

        {/* Mode Display */}
        <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
          {getModeIcon()}
          <span className="capitalize">{mode}</span>
        </div>

        {/* Humidity Display */}
        <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
          <Droplets className="w-4 h-4" />
          <span>{humidity}% Humidity</span>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col gap-6 ml-8">
        {/* Quick Adjust */}
        <div>
          <h3 className="text-gray-700 font-medium mb-3">Quick Adjust</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2 px-6 py-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
              onClick={() => handleQuickAdjust(-1)}
            >
              <Snowflake className="w-4 h-4" />
              -1°
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2 px-6 py-3 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors"
              onClick={() => handleQuickAdjust(1)}
            >
              <Wind className="w-4 h-4" />
              +1°
            </Button>
          </div>
        </div>

        {/* HVAC Status */}
        <div>
          <h3 className="text-gray-700 font-medium mb-3">HVAC Status</h3>
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${getHvacStatusColor()}`}>
              <Wind className="w-4 h-4" />
              <span className="capitalize">{hvac_action}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};