// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File path locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
// Rule #6: the dashboard already and all files already created and structured.
// File path: components/ui/alarm-keypad.tsx

"use client";

import React, { useState, useCallback } from 'react';
import { Shield, Home, ShieldOff, AlertTriangle } from 'lucide-react';

interface AlarmKeypadProps {
  alarmState?: 'disarmed' | 'armed-home' | 'armed-away' | 'alarm' | 'error';
  pinValue?: string;
  errorMessage?: string;
  isLoading?: boolean;
  onDigitPress?: (digit: string) => void;
  onClear?: () => void;
  onArmHome?: () => void;
  onArmAway?: () => void;
  onDisarm?: () => void;
  onPanic?: () => void;
  onSubmit?: () => void;
  compact?: boolean;
}

export const AlarmKeypad: React.FC<AlarmKeypadProps> = ({
  alarmState = 'disarmed',
  pinValue = '',
  errorMessage = '',
  isLoading = false,
  onDigitPress,
  onClear,
  onArmHome,
  onArmAway,
  onDisarm,
  onPanic,
  onSubmit,
  compact = false
}) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handleKeyPress = useCallback((key: string, callback?: () => void) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 120);
    callback?.();
  }, []);

  const getStatusLEDs = () => {
    switch (alarmState) {
      case 'disarmed':
        return { green: true, red: false, yellow: false };
      case 'armed-home':
      case 'armed-away':
        return { green: false, red: true, yellow: false };
      case 'alarm':
        return { green: false, red: true, yellow: true };
      case 'error':
        return { green: false, red: false, yellow: true };
      default:
        return { green: false, red: false, yellow: false };
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'PROCESSING...';
    if (errorMessage) return errorMessage;
    
    switch (alarmState) {
      case 'disarmed':
        return 'SYSTEM DISARMED';
      case 'armed-home':
        return 'ARMED HOME';
      case 'armed-away':
        return 'ARMED AWAY';
      case 'alarm':
        return 'ALARM TRIGGERED';
      case 'error':
        return 'SYSTEM ERROR';
      default:
        return 'READY';
    }
  };

  const leds = getStatusLEDs();
  
  const KeypadButton: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'number' | 'function' | 'panic';
    keyId?: string;
  }> = ({ children, onClick, className = '', variant = 'number', keyId }) => {
    const isPressed = pressedKey === keyId;
    
    let buttonStyle = {};
    let buttonClass = '';
    
    if (variant === 'number') {
      buttonClass = `
        text-gray-800 font-bold ${compact ? 'text-sm' : 'text-xl'}
        transition-all duration-120 ease-out
        border-2 border-gray-400
        ${isPressed ? 'transform scale-95' : 'hover:scale-[1.02]'}
      `;
      buttonStyle = {
        background: isPressed 
          ? 'linear-gradient(145deg, #d4d4d8, #f4f4f5)'
          : 'linear-gradient(145deg, #f9fafb, #e5e7eb)',
        boxShadow: isPressed 
          ? 'inset 3px 3px 8px rgba(0,0,0,0.25), inset -1px -1px 4px rgba(255,255,255,0.8)'
          : '4px 4px 10px rgba(0,0,0,0.15), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1)',
        textShadow: isPressed 
          ? '1px 1px 2px rgba(0,0,0,0.3)'
          : '0px 1px 1px rgba(255,255,255,0.8), 0px -1px 1px rgba(0,0,0,0.1)',
        borderColor: isPressed ? '#9ca3af' : '#d1d5db'
      };
    } else if (variant === 'function') {
      buttonClass = `
        text-blue-800 font-semibold ${compact ? 'text-xs' : 'text-sm'}
        transition-all duration-120 ease-out
        border-2 border-blue-400
        ${isPressed ? 'transform scale-95' : 'hover:scale-[1.02]'}
      `;
      buttonStyle = {
        background: isPressed 
          ? 'linear-gradient(145deg, #bfdbfe, #dbeafe)'
          : 'linear-gradient(145deg, #dbeafe, #bfdbfe)',
        boxShadow: isPressed 
          ? 'inset 3px 3px 8px rgba(59, 130, 246, 0.3), inset -1px -1px 4px rgba(255,255,255,0.9)'
          : '4px 4px 10px rgba(59, 130, 246, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(59, 130, 246, 0.1)',
        textShadow: isPressed 
          ? '1px 1px 2px rgba(59, 130, 246, 0.4)'
          : '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(59, 130, 246, 0.2)',
        borderColor: isPressed ? '#60a5fa' : '#93c5fd'
      };
    } else if (variant === 'panic') {
      buttonClass = `
        text-red-800 font-bold ${compact ? 'text-xs' : 'text-sm'}
        transition-all duration-120 ease-out
        border-2 border-red-400
        ${isPressed ? 'transform scale-95' : 'hover:scale-[1.02]'}
      `;
      buttonStyle = {
        background: isPressed 
          ? 'linear-gradient(145deg, #fecaca, #fee2e2)'
          : 'linear-gradient(145deg, #fee2e2, #fecaca)',
        boxShadow: isPressed 
          ? 'inset 3px 3px 8px rgba(239, 68, 68, 0.3), inset -1px -1px 4px rgba(255,255,255,0.9)'
          : '4px 4px 10px rgba(239, 68, 68, 0.2), -2px -2px 8px rgba(255,255,255,0.9), inset 1px 1px 2px rgba(255,255,255,0.9), inset -1px -1px 2px rgba(239, 68, 68, 0.1)',
        textShadow: isPressed 
          ? '1px 1px 2px rgba(239, 68, 68, 0.4)'
          : '0px 1px 1px rgba(255,255,255,0.9), 0px -1px 1px rgba(239, 68, 68, 0.2)',
        borderColor: isPressed ? '#f87171' : '#fca5a5'
      };
    }
    
    return (
      <button
        className={`relative select-none cursor-pointer ${buttonClass} ${className}`}
        onClick={() => handleKeyPress(keyId || '', onClick)}
        style={buttonStyle}
      >
        {children}
      </button>
    );
  };

  // Compact layout - Aligned 4x4 grid with uniform button sizes
  if (compact) {
    return (
      <div className="w-full h-full p-4">
        <div 
          className="w-full h-full p-3 flex"
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
          {/* Left Column: Status & Display */}
          <div className="flex flex-col justify-between w-1/4 pr-3">
            {/* DSC Badge & LEDs */}
            <div className="flex flex-col items-center space-y-2">
              <div 
                className="inline-flex items-center justify-center w-14 h-5 text-white text-xs font-bold"
                style={{
                  background: 'linear-gradient(145deg, #2d3748, #1a202c)',
                  borderRadius: '4px',
                  border: '1px solid #1A202C',
                  boxShadow: '1px 1px 3px rgba(0,0,0,0.3)',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.8)'
                }}
              >
                DSC
              </div>
              
              {/* Status LEDs in row */}
              <div className="flex space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full border ${
                    leds.green ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'
                  }`}
                  style={{
                    boxShadow: leds.green 
                      ? '0 0 4px rgba(34, 197, 94, 0.8)' 
                      : 'inset 1px 1px 1px rgba(0,0,0,0.2)'
                  }}
                />
                <div 
                  className={`w-2 h-2 rounded-full border ${
                    leds.red ? 'bg-red-500 border-red-600' : 'bg-gray-300 border-gray-400'
                  }`}
                  style={{
                    boxShadow: leds.red 
                      ? '0 0 4px rgba(239, 68, 68, 0.8)' 
                      : 'inset 1px 1px 1px rgba(0,0,0,0.2)'
                  }}
                />
                <div 
                  className={`w-2 h-2 rounded-full border ${
                    leds.yellow ? 'bg-yellow-500 border-yellow-600' : 'bg-gray-300 border-gray-400'
                  }`}
                  style={{
                    boxShadow: leds.yellow 
                      ? '0 0 4px rgba(234, 179, 8, 0.8)' 
                      : 'inset 1px 1px 1px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </div>

            {/* LCD Display */}
            <div 
              className="p-3 border flex-1 flex items-center justify-center"
              style={{
                background: 'linear-gradient(145deg, #0f1419, #1a2b3d)',
                borderColor: '#2D3748',
                borderRadius: '6px',
                boxShadow: `
                  inset 2px 2px 4px rgba(0,0,0,0.6),
                  inset -1px -1px 3px rgba(255,255,255,0.05)
                `
              }}
            >
              <div className="text-green-400 font-mono text-xs text-center">
                <div 
                  className="font-bold"
                  style={{ textShadow: '0 0 3px rgba(34, 197, 94, 0.5)' }}
                >
                  {compact ? alarmState.toUpperCase().replace('-', ' ') : getStatusText()}
                </div>
                <div 
                  className="text-xs mt-1"
                  style={{ textShadow: '0 0 3px rgba(34, 197, 94, 0.5)' }}
                >
                  {pinValue ? '•'.repeat(pinValue.length) : '----'}
                </div>
              </div>
            </div>
          </div>

          {/* Aligned Button Grid - 4 rows × 4 columns */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Row 1: 1, 2, 3, AWAY */}
            <div className="flex gap-2 h-1/4">
              <KeypadButton
                keyId="1"
                onClick={() => onDigitPress?.('1')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                1
              </KeypadButton>
              <KeypadButton
                keyId="2"
                onClick={() => onDigitPress?.('2')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                2
              </KeypadButton>
              <KeypadButton
                keyId="3"
                onClick={() => onDigitPress?.('3')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                3
              </KeypadButton>
              <KeypadButton
                keyId="arm-away"
                onClick={onArmAway}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="function"
              >
                AWAY
              </KeypadButton>
            </div>

            {/* Row 2: 4, 5, 6, HOME */}
            <div className="flex gap-2 h-1/4">
              <KeypadButton
                keyId="4"
                onClick={() => onDigitPress?.('4')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                4
              </KeypadButton>
              <KeypadButton
                keyId="5"
                onClick={() => onDigitPress?.('5')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                5
              </KeypadButton>
              <KeypadButton
                keyId="6"
                onClick={() => onDigitPress?.('6')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                6
              </KeypadButton>
              <KeypadButton
                keyId="arm-home"
                onClick={onArmHome}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="function"
              >
                HOME
              </KeypadButton>
            </div>

            {/* Row 3: 7, 8, 9, DISARM */}
            <div className="flex gap-2 h-1/4">
              <KeypadButton
                keyId="7"
                onClick={() => onDigitPress?.('7')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                7
              </KeypadButton>
              <KeypadButton
                keyId="8"
                onClick={() => onDigitPress?.('8')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                8
              </KeypadButton>
              <KeypadButton
                keyId="9"
                onClick={() => onDigitPress?.('9')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                9
              </KeypadButton>
              <KeypadButton
                keyId="disarm"
                onClick={onDisarm}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="function"
              >
                DISARM
              </KeypadButton>
            </div>

            {/* Row 4: CLR, 0, ENT, PANIC */}
            <div className="flex gap-2 h-1/4">
              <KeypadButton
                keyId="clear"
                onClick={onClear}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="function"
              >
                CLR
              </KeypadButton>
              <KeypadButton
                keyId="0"
                onClick={() => onDigitPress?.('0')}
                className="flex-1 rounded-lg flex items-center justify-center text-lg font-bold"
              >
                0
              </KeypadButton>
              <KeypadButton
                keyId="enter"
                onClick={onSubmit}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="function"
              >
                ENT
              </KeypadButton>
              <KeypadButton
                keyId="panic"
                onClick={onPanic}
                className="flex-1 rounded-lg flex items-center justify-center text-sm font-bold"
                variant="panic"
              >
                PANIC
              </KeypadButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original full-size layout (unchanged)
  return (
    <div className="w-full h-full">
      {/* Main Keypad Housing - Enhanced 3D effect */}
      <div 
        className="w-full h-full p-4 flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #f7f4ed, #ede8dc)',
          border: '3px solid #d4c5a0',
          borderRadius: '16px',
          boxShadow: `
            8px 8px 20px rgba(0,0,0,0.15),
            -4px -4px 16px rgba(255,255,255,0.9),
            inset 2px 2px 4px rgba(255,255,255,0.8),
            inset -1px -1px 3px rgba(0,0,0,0.1)
          `
        }}
      >
        {/* DSC Brand Badge and Status LEDs on same line */}
        <div className="flex justify-center items-center mb-4 space-x-8">
          {/* DSC Brand Badge - Enhanced 3D */}
          <div 
            className="inline-flex items-center justify-center w-16 h-6 text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(145deg, #2d3748, #1a202c)',
              borderRadius: '6px',
              border: '1px solid #1A202C',
              boxShadow: '2px 2px 6px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.1)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            DSC
          </div>

          {/* Status LEDs - Enhanced glow */}
          <div className="flex space-x-4">
            <div className="flex flex-col items-center">
              <div 
                className={`w-3 h-3 rounded-full border-2 ${
                  leds.green ? 'bg-green-500 border-green-600' : 'bg-gray-300 border-gray-400'
                }`}
                style={{
                  boxShadow: leds.green 
                    ? '0 0 8px rgba(34, 197, 94, 0.8), inset 1px 1px 2px rgba(255,255,255,0.3)' 
                    : 'inset 1px 1px 2px rgba(0,0,0,0.2), 1px 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <span className="text-xs font-semibold mt-1 text-gray-700 drop-shadow-sm">READY</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className={`w-3 h-3 rounded-full border-2 ${
                  leds.red ? 'bg-red-500 border-red-600' : 'bg-gray-300 border-gray-400'
                }`}
                style={{
                  boxShadow: leds.red 
                    ? '0 0 8px rgba(239, 68, 68, 0.8), inset 1px 1px 2px rgba(255,255,255,0.3)' 
                    : 'inset 1px 1px 2px rgba(0,0,0,0.2), 1px 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <span className="text-xs font-semibold mt-1 text-gray-700 drop-shadow-sm">ARMED</span>
            </div>
            <div className="flex flex-col items-center">
              <div 
                className={`w-3 h-3 rounded-full border-2 ${
                  leds.yellow ? 'bg-yellow-500 border-yellow-600' : 'bg-gray-300 border-gray-400'
                }`}
                style={{
                  boxShadow: leds.yellow 
                    ? '0 0 8px rgba(234, 179, 8, 0.8), inset 1px 1px 2px rgba(255,255,255,0.3)' 
                    : 'inset 1px 1px 2px rgba(0,0,0,0.2), 1px 1px 3px rgba(0,0,0,0.1)'
                }}
              />
              <span className="text-xs font-semibold mt-1 text-gray-700 drop-shadow-sm">TROUBLE</span>
            </div>
          </div>
        </div>

        {/* LCD Display - Enhanced depth */}
        <div 
          className="mb-4 p-3 border-2"
          style={{
            background: 'linear-gradient(145deg, #0f1419, #1a2b3d)',
            borderColor: '#2D3748',
            borderRadius: '8px',
            boxShadow: `
              inset 4px 4px 8px rgba(0,0,0,0.6),
              inset -2px -2px 6px rgba(255,255,255,0.05),
              2px 2px 6px rgba(0,0,0,0.3)
            `
          }}
        >
          <div className="text-green-400 font-mono text-sm leading-tight">
            <div className="relative flex items-center">
              <span 
                className="font-bold"
                style={{ textShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
              >
                {getStatusText()}
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <span 
                    className="text-base"
                    style={{ textShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}
                  >
                    {pinValue ? '•'.repeat(pinValue.length) : '- - - -'}
                  </span>
                  {isLoading && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Number Pad - Enhanced 3D buttons */}
        <div className="grid grid-cols-3 gap-3 mb-3 flex-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <KeypadButton
              key={num}
              keyId={num.toString()}
              onClick={() => onDigitPress?.(num.toString())}
              className="h-12 rounded-xl"
            >
              <strong>{num}</strong>
            </KeypadButton>
          ))}
          <KeypadButton
            keyId="clear"
            onClick={onClear}
            className="h-12 rounded-xl"
            variant="function"
          >
            CLR
          </KeypadButton>
          <KeypadButton
            keyId="0"
            onClick={() => onDigitPress?.('0')}
            className="h-12 rounded-xl"
          >
            <strong>0</strong>
          </KeypadButton>
          <KeypadButton
            keyId="enter"
            onClick={onSubmit}
            className="h-12 rounded-xl"
            variant="function"
          >
            ENT
          </KeypadButton>
        </div>

        {/* Function Keys - Enhanced 3D buttons */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <KeypadButton
            keyId="arm-away"
            onClick={onArmAway}
            className="h-10 flex items-center justify-center space-x-1 rounded-xl"
            variant="function"
          >
            <span>AWAY</span>
          </KeypadButton>
          <KeypadButton
            keyId="arm-home"
            onClick={onArmHome}
            className="h-10 flex items-center justify-center space-x-1 rounded-xl"
            variant="function"
          >
            <Home className="w-3 h-3" />
            <span>HOME</span>
          </KeypadButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <KeypadButton
            keyId="disarm"
            onClick={onDisarm}
            className="h-10 flex items-center justify-center space-x-1 rounded-xl"
            variant="function"
          >
            <span>DISARM</span>
          </KeypadButton>
          <KeypadButton
            keyId="panic"
            onClick={onPanic}
            className="h-10 flex items-center justify-center space-x-1 rounded-xl"
            variant="panic"
          >
            <span>PANIC</span>
          </KeypadButton>
        </div>
      </div>
    </div>
  );
};