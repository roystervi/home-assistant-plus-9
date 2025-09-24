"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  voiceRecognitionService,
  VoiceRecognitionResult, 
  RecognitionState, 
  VoiceRecognitionConfig,
  VoiceRecognitionEvents,
  TTSRequest
} from '@/lib/voice-service';

export interface UseVoiceRecognitionOptions {
  autoInitialize?: boolean;
  wakeWords?: string[];
  onResult?: (result: VoiceRecognitionResult) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: RecognitionState) => void;
  onVolumeChange?: (volume: number) => void;
  onWakeWordDetected?: (word: string, confidence: number) => void;
  debounceVolumeMs?: number;
}

export interface UseVoiceRecognitionReturn {
  // State
  isInitialized: boolean;
  state: RecognitionState;
  hasPermission: boolean;
  isMuted: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentVolume: number;
  lastResult: VoiceRecognitionResult | null;
  error: Error | null;
  availableVoices: SpeechSynthesisVoice[];

  // Methods
  initialize: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => Promise<void>;
  startWakeWordDetection: () => Promise<void>;
  stopWakeWordDetection: () => void;
  speak: (text: string, options?: Partial<TTSRequest>) => string;
  stopSpeaking: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  updateConfig: (config: Partial<VoiceRecognitionConfig>) => void;
  retry: () => Promise<void>;
  reset: () => void;
}

export const useVoiceRecognition = (
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn => {
  const {
    autoInitialize = false,
    wakeWords,
    onResult,
    onError,
    onStateChange,
    onVolumeChange,
    onWakeWordDetected,
    debounceVolumeMs = 100
  } = options;

  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const eventHandlersRef = useRef<{
    stateChange?: (state: RecognitionState) => void;
    result?: (result: VoiceRecognitionResult) => void;
    error?: (error: Error, context?: string) => void;
    volumeChange?: (level: number) => void;
    wakeWordDetected?: (word: string, confidence: number) => void;
    permissionChanged?: (granted: boolean) => void;
    microphoneToggle?: (enabled: boolean) => void;
  }>({});

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [state, setState] = useState<RecognitionState>('idle');
  const [hasPermission, setHasPermission] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [lastResult, setLastResult] = useState<VoiceRecognitionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Debounced volume update
  const debouncedVolumeUpdate = useCallback((volume: number) => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) {
        setCurrentVolume(volume);
        onVolumeChange?.(volume);
      }
    }, debounceVolumeMs);
  }, [debounceVolumeMs, onVolumeChange]);

  // Setup event handlers
  useEffect(() => {
    // Remove old event handlers
    Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        voiceRecognitionService.off(event as keyof VoiceRecognitionEvents, handler);
      }
    });

    // Setup new event handlers
    eventHandlersRef.current = {
      stateChange: (state: RecognitionState) => {
        if (isUnmountedRef.current) return;
        setState(state);
        setIsListening(state === 'listening' || state === 'waitingForWakeWord');
        setIsSpeaking(state === 'speaking');
        onStateChange?.(state);
      },

      result: (result: VoiceRecognitionResult) => {
        if (isUnmountedRef.current) return;
        setLastResult(result);
        setError(null); // Clear error on successful result
        onResult?.(result);
      },

      error: (error: Error, context?: string) => {
        if (isUnmountedRef.current) return;
        setError(error);
        onError?.(error);
      },

      volumeChange: (level: number) => {
        if (isUnmountedRef.current) return;
        debouncedVolumeUpdate(level);
      },

      wakeWordDetected: (word: string, confidence: number) => {
        if (isUnmountedRef.current) return;
        onWakeWordDetected?.(word, confidence);
      },

      permissionChanged: (granted: boolean) => {
        if (isUnmountedRef.current) return;
        setHasPermission(granted);
      },

      microphoneToggle: (enabled: boolean) => {
        if (isUnmountedRef.current) return;
        setIsMuted(!enabled);
      }
    };

    // Register new event handlers
    Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        voiceRecognitionService.on(event as keyof VoiceRecognitionEvents, handler);
      }
    });

    return () => {
      // Cleanup on effect change
      Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
        if (handler) {
          voiceRecognitionService.off(event as keyof VoiceRecognitionEvents, handler);
        }
      });
    };
  }, [debouncedVolumeUpdate, onStateChange, onResult, onError, onWakeWordDetected]);

  // Initialize service
  const initialize = useCallback(async () => {
    if (isUnmountedRef.current) return;
    
    try {
      setError(null);
      
      // Update config if provided
      if (wakeWords) {
        voiceRecognitionService.updateConfig({ wakeWords });
      }

      await voiceRecognitionService.initialize();
      
      if (!isUnmountedRef.current) {
        setIsInitialized(voiceRecognitionService.isInitialized());
        setHasPermission(voiceRecognitionService.hasPermissions());
        setIsMuted(voiceRecognitionService.isMicrophoneMuted());
        setAvailableVoices(voiceRecognitionService.getAvailableVoices());
        setState(voiceRecognitionService.getState());
      }
    } catch (err) {
      if (!isUnmountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to initialize voice recognition');
        setError(error);
        onError?.(error);
      }
    }
  }, [wakeWords, onError]);

  // Service methods with error handling
  const startListening = useCallback(async () => {
    if (!voiceRecognitionService.isInitialized()) {
      throw new Error('Voice service not initialized');
    }
    
    try {
      setError(null);
      await voiceRecognitionService.startListening();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    voiceRecognitionService.stopListening();
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  const startWakeWordDetection = useCallback(async () => {
    if (!voiceRecognitionService.isInitialized()) {
      throw new Error('Voice service not initialized');
    }
    
    try {
      setError(null);
      await voiceRecognitionService.startWakeWordDetection();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start wake word detection');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [onError]);

  const stopWakeWordDetection = useCallback(() => {
    voiceRecognitionService.stopWakeWordDetection();
  }, []);

  const speak = useCallback((text: string, options?: Partial<TTSRequest>): string => {
    if (!voiceRecognitionService.isInitialized()) {
      throw new Error('Voice service not initialized');
    }
    
    try {
      setError(null);
      return voiceRecognitionService.speak(text, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to speak text');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [onError]);

  const stopSpeaking = useCallback(() => {
    voiceRecognitionService.stopSpeaking();
  }, []);

  const mute = useCallback(() => {
    voiceRecognitionService.mute();
  }, []);

  const unmute = useCallback(() => {
    voiceRecognitionService.unmute();
  }, []);

  const toggleMute = useCallback(() => {
    voiceRecognitionService.toggleMute();
  }, []);

  const updateConfig = useCallback((config: Partial<VoiceRecognitionConfig>) => {
    voiceRecognitionService.updateConfig(config);
  }, []);

  // Retry mechanism
  const retry = useCallback(async () => {
    try {
      setError(null);
      await voiceRecognitionService.initialize();
      if (!isUnmountedRef.current) {
        setIsInitialized(voiceRecognitionService.isInitialized());
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Retry failed');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [onError]);

  // Reset everything
  const reset = useCallback(() => {
    voiceRecognitionService.destroy();
    
    setIsInitialized(false);
    setState('idle');
    setHasPermission(false);
    setIsMuted(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentVolume(0);
    setLastResult(null);
    setError(null);
    setAvailableVoices([]);
  }, []);

  // Auto-initialize effect
  useEffect(() => {
    if (autoInitialize && !isInitialized && !voiceRecognitionService.isInitialized()) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Clear debounce timeout
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      
      // Remove event handlers
      Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
        if (handler) {
          voiceRecognitionService.off(event as keyof VoiceRecognitionEvents, handler);
        }
      });
    };
  }, []);

  return {
    // State
    isInitialized,
    state,
    hasPermission,
    isMuted,
    isListening,
    isSpeaking,
    currentVolume,
    lastResult,
    error,
    availableVoices,

    // Methods
    initialize,
    startListening,
    stopListening,
    toggleListening,
    startWakeWordDetection,
    stopWakeWordDetection,
    speak,
    stopSpeaking,
    mute,
    unmute,
    toggleMute,
    updateConfig,
    retry,
    reset
  };
};

// Export types for convenience
export type {
  VoiceRecognitionResult,
  RecognitionState,
  VoiceRecognitionConfig,
  TTSRequest
} from '@/lib/voice-service';