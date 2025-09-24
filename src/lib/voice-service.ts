// src/lib/voice-recognition-service.ts

interface VoiceRecognitionConfig {
  wakeWords: string[];
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
  wakeSensitivity: number;
  voiceId?: string;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
  noiseSuppressionEnabled: boolean;
  echoCancellationEnabled: boolean;
  autoGainControlEnabled: boolean;
  pushToTalk: boolean;
  hotkey?: string;
  silenceTimeout: number;
  audioBufferSize: number;
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  timestamp: number;
}

interface VoiceActivityResult {
  isActive: boolean;
  energy: number;
  timestamp: number;
}

interface TTSRequest {
  id: string;
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  priority: 'high' | 'normal' | 'low';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

type RecognitionState = 
  | 'idle' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'muted' 
  | 'error'
  | 'waitingForWakeWord'
  | 'wakeWordDetected';

interface VoiceRecognitionEvents {
  stateChange: (state: RecognitionState) => void;
  result: (result: VoiceRecognitionResult) => void;
  wakeWordDetected: (word: string, confidence: number) => void;
  error: (error: Error, context?: string) => void;
  volumeChange: (level: number) => void;
  voiceActivity: (result: VoiceActivityResult) => void;
  permissionChanged: (granted: boolean) => void;
  configChanged: (config: Partial<VoiceRecognitionConfig>) => void;
  ttsStart: (requestId: string) => void;
  ttsEnd: (requestId: string) => void;
  ttsError: (requestId: string, error: Error) => void;
  microphoneToggle: (enabled: boolean) => void;
}

class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<keyof T, Set<T[keyof T]>> = new Map();

  on<K extends keyof T>(event: K, listener: T[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

class VoiceRecognitionService extends EventEmitter<VoiceRecognitionEvents> {
  private static instance: VoiceRecognitionService | null = null;
  
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  private state: RecognitionState = 'idle';
  private isInitialized = false;
  private hasPermission = false;
  private isMuted = false;
  private isListening = false;
  private isSpeaking = false;
  
  private config: VoiceRecognitionConfig = {
    wakeWords: ['hey assistant', 'computer', 'assistant'],
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    confidenceThreshold: 0.7,
    wakeSensitivity: 0.6,
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 1.0,
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    autoGainControlEnabled: true,
    pushToTalk: false,
    silenceTimeout: 5000,
    audioBufferSize: 4096
  };
  
  private ttsQueue: TTSRequest[] = [];
  private currentTTSRequest: TTSRequest | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  
  private audioBuffer: Float32Array[] = [];
  private bufferMaxLength = 100; // ~2 seconds at 50fps
  private volumeLevel = 0;
  private vadThreshold = 0.01;
  
  private silenceTimer: NodeJS.Timeout | null = null;
  private vadTimer: NodeJS.Timeout | null = null;
  
  private hotkeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private isHotkeyPressed = false;

  private constructor() {
    super();
    this.log('VoiceRecognitionService instance created');
    this.loadConfig();
    this.setupHotkeyListener();
  }

  static getInstance(): VoiceRecognitionService {
    if (!VoiceRecognitionService.instance) {
      VoiceRecognitionService.instance = new VoiceRecognitionService();
    }
    return VoiceRecognitionService.instance;
  }

  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[VoiceRecognition ${timestamp}] ${message}`, data || '');
  }

  private logError(message: string, error: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[VoiceRecognition ${timestamp}] ${message}`, error);
  }

  private checkBrowserSupport(): boolean {
    const hasWebSpeechAPI = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    
    this.log('Browser support check:', {
      webSpeechAPI: hasWebSpeechAPI,
      getUserMedia: hasGetUserMedia,
      audioContext: hasAudioContext,
      speechSynthesis: hasSpeechSynthesis
    });
    
    return hasWebSpeechAPI && hasGetUserMedia && hasAudioContext && hasSpeechSynthesis;
  }

  async initialize(): Promise<void> {
    try {
      this.log('Initializing VoiceRecognitionService...');
      
      if (!this.checkBrowserSupport()) {
        throw new Error('Browser does not support required Web APIs');
      }

      await this.requestMicrophonePermission();
      await this.initializeAudioContext();
      this.initializeSpeechRecognition();
      this.initializeSpeechSynthesis();
      
      this.isInitialized = true;
      this.setState('idle');
      this.log('VoiceRecognitionService initialized successfully');
      
    } catch (error) {
      this.logError('Failed to initialize VoiceRecognitionService', error);
      this.setState('error');
      this.emit('error', error as Error, 'initialization');
      throw error;
    }
  }

  private async requestMicrophonePermission(): Promise<void> {
    try {
      this.log('Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: this.config.echoCancellationEnabled,
          noiseSuppression: this.config.noiseSuppressionEnabled,
          autoGainControl: this.config.autoGainControlEnabled
        } 
      });
      
      this.mediaStream = stream;
      this.hasPermission = true;
      this.emit('permissionChanged', true);
      this.log('Microphone permission granted');
      
    } catch (error) {
      this.hasPermission = false;
      this.emit('permissionChanged', false);
      this.logError('Microphone permission denied', error);
      throw new Error('Microphone permission is required');
    }
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.log('Initializing audio context...');
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      if (this.mediaStream) {
        this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        
        this.analyser.fftSize = this.config.audioBufferSize;
        this.analyser.smoothingTimeConstant = 0.8;
        
        this.processor = this.audioContext.createScriptProcessor(this.config.audioBufferSize, 1, 1);
        
        this.microphone.connect(this.analyser);
        this.analyser.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
        
        this.processor.onaudioprocess = (event) => this.processAudioData(event);
        
        this.log('Audio context initialized successfully');
      }
      
    } catch (error) {
      this.logError('Failed to initialize audio context', error);
      throw error;
    }
  }

  private initializeSpeechRecognition(): void {
    try {
      this.log('Initializing speech recognition...');
      
      const SpeechRecognitionClass = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
      
      this.recognition = new SpeechRecognitionClass();
      
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
      
      this.recognition.onstart = () => {
        this.log('Speech recognition started');
        this.isListening = true;
        if (this.state !== 'waitingForWakeWord') {
          this.setState('listening');
        }
      };
      
      this.recognition.onend = () => {
        this.log('Speech recognition ended');
        this.isListening = false;
        
        if (this.state === 'listening' || this.state === 'waitingForWakeWord') {
          if (!this.isMuted && !this.config.pushToTalk) {
            // Restart recognition for continuous listening
            setTimeout(() => this.startListening(), 100);
          } else {
            this.setState('idle');
          }
        }
      };
      
      this.recognition.onresult = (event) => this.handleRecognitionResult(event);
      
      this.recognition.onerror = (event) => {
        this.logError('Speech recognition error', event.error);
        
        // Handle specific errors
        switch (event.error) {
          case 'not-allowed':
            this.hasPermission = false;
            this.emit('permissionChanged', false);
            break;
          case 'network':
            // Retry after a delay
            setTimeout(() => {
              if (this.shouldBeListening()) {
                this.startListening();
              }
            }, 2000);
            return;
          case 'aborted':
            // Normal stop, don't emit error
            return;
        }
        
        this.emit('error', new Error(`Speech recognition error: ${event.error}`), 'recognition');
      };
      
      this.log('Speech recognition initialized successfully');
      
    } catch (error) {
      this.logError('Failed to initialize speech recognition', error);
      throw error;
    }
  }

  private initializeSpeechSynthesis(): void {
    try {
      this.log('Initializing speech synthesis...');
      
      this.synthesis = window.speechSynthesis;
      
      // Load available voices
      this.loadVoices();
      
      // Listen for voices changed event (some browsers load voices asynchronously)
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = () => this.loadVoices();
      }
      
      this.log('Speech synthesis initialized successfully');
      
    } catch (error) {
      this.logError('Failed to initialize speech synthesis', error);
      throw error;
    }
  }

  private loadVoices(): void {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
      this.log('Available voices loaded:', this.availableVoices.length);
    }
  }

  private processAudioData(event: AudioProcessorEvent): void {
    const inputBuffer = event.inputBuffer.getChannelData(0);
    
    // Calculate volume level
    let sum = 0;
    for (let i = 0; i < inputBuffer.length; i++) {
      sum += inputBuffer[i] * inputBuffer[i];
    }
    this.volumeLevel = Math.sqrt(sum / inputBuffer.length);
    
    // Emit volume change
    this.emit('volumeChange', this.volumeLevel);
    
    // Voice Activity Detection
    const isVoiceActive = this.volumeLevel > this.vadThreshold;
    this.emit('voiceActivity', {
      isActive: isVoiceActive,
      energy: this.volumeLevel,
      timestamp: Date.now()
    });
    
    // Store audio buffer for wake word detection
    if (this.audioBuffer.length >= this.bufferMaxLength) {
      this.audioBuffer.shift();
    }
    this.audioBuffer.push(new Float32Array(inputBuffer));
    
    // Handle silence detection
    if (isVoiceActive) {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.state === 'listening' && !this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        this.handleSilenceTimeout();
      }, this.config.silenceTimeout);
    }
  }

  private handleSilenceTimeout(): void {
    this.log('Silence timeout reached');
    if (this.state === 'listening' && this.config.continuous) {
      // Continue listening but reset internal state
      this.stopListening();
      setTimeout(() => this.startListening(), 100);
    }
  }

  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const results = Array.from(event.results);
    const lastResult = results[results.length - 1];
    
    if (!lastResult) return;
    
    const transcript = lastResult[0].transcript.trim().toLowerCase();
    const confidence = lastResult[0].confidence || 0;
    const isFinal = lastResult.isFinal;
    
    this.log('Recognition result:', { transcript, confidence, isFinal });
    
    // Check for wake word if in wake word mode
    if (this.state === 'waitingForWakeWord') {
      const wakeWordDetected = this.checkWakeWord(transcript, confidence);
      if (wakeWordDetected) {
        this.handleWakeWordDetected(wakeWordDetected.word, wakeWordDetected.confidence);
        return;
      }
    }
    
    // Filter by confidence threshold
    if (confidence < this.config.confidenceThreshold && isFinal) {
      this.log('Result filtered by confidence threshold');
      return;
    }
    
    // Build alternatives
    const alternatives = Array.from(lastResult).map((alternative, index) => ({
      transcript: alternative.transcript.trim(),
      confidence: alternative.confidence || (1 - index * 0.1)
    }));
    
    const result: VoiceRecognitionResult = {
      transcript: transcript,
      confidence: confidence,
      isFinal: isFinal,
      alternatives: alternatives,
      timestamp: Date.now()
    };
    
    this.emit('result', result);
    
    if (isFinal) {
      this.setState('processing');
    }
  }

  private checkWakeWord(transcript: string, confidence: number): { word: string; confidence: number } | null {
    for (const wakeWord of this.config.wakeWords) {
      const similarity = this.calculateStringSimilarity(transcript, wakeWord);
      const adjustedConfidence = confidence * similarity;
      
      if (adjustedConfidence >= this.config.wakeSensitivity) {
        return { word: wakeWord, confidence: adjustedConfidence };
      }
    }
    return null;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple fuzzy matching using Levenshtein distance
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  private handleWakeWordDetected(word: string, confidence: number): void {
    this.log('Wake word detected:', { word, confidence });
    this.setState('wakeWordDetected');
    this.emit('wakeWordDetected', word, confidence);
    
    // Switch to active listening mode
    setTimeout(() => {
      this.setState('listening');
    }, 500);
  }

  private setupHotkeyListener(): void {
    if (this.config.hotkey) {
      this.hotkeyHandler = (event: KeyboardEvent) => {
        if (this.isHotkeyMatch(event, this.config.hotkey!)) {
          event.preventDefault();
          
          if (this.config.pushToTalk) {
            if (event.type === 'keydown' && !this.isHotkeyPressed) {
              this.isHotkeyPressed = true;
              this.startListening();
            } else if (event.type === 'keyup' && this.isHotkeyPressed) {
              this.isHotkeyPressed = false;
              this.stopListening();
            }
          } else {
            if (event.type === 'keydown') {
              this.toggleListening();
            }
          }
        }
      };
      
      document.addEventListener('keydown', this.hotkeyHandler);
      document.addEventListener('keyup', this.hotkeyHandler);
    }
  }

  private isHotkeyMatch(event: KeyboardEvent, hotkey: string): boolean {
    const keys = hotkey.toLowerCase().split('+');
    const pressedKeys = [];
    
    if (event.ctrlKey) pressedKeys.push('ctrl');
    if (event.altKey) pressedKeys.push('alt');
    if (event.shiftKey) pressedKeys.push('shift');
    if (event.metaKey) pressedKeys.push('meta');
    
    pressedKeys.push(event.key.toLowerCase());
    
    return keys.length === pressedKeys.length && 
           keys.every(key => pressedKeys.includes(key));
  }

  // Public API Methods

  async startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }
    
    if (!this.hasPermission) {
      await this.requestMicrophonePermission();
    }
    
    if (this.isMuted) {
      this.log('Cannot start listening: microphone is muted');
      return;
    }
    
    if (this.isListening) {
      this.log('Already listening');
      return;
    }
    
    try {
      this.log('Starting speech recognition...');
      this.recognition?.start();
    } catch (error) {
      this.logError('Failed to start listening', error);
      this.emit('error', error as Error, 'startListening');
    }
  }

  stopListening(): void {
    if (this.isListening && this.recognition) {
      this.log('Stopping speech recognition...');
      this.recognition.stop();
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    this.setState('idle');
  }

  async startWakeWordDetection(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.setState('waitingForWakeWord');
    this.startListening();
  }

  stopWakeWordDetection(): void {
    this.stopListening();
    this.setState('idle');
  }

  toggleListening(): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  private shouldBeListening(): boolean {
    return !this.isMuted && 
           (this.state === 'listening' || this.state === 'waitingForWakeWord') &&
           (!this.config.pushToTalk || this.isHotkeyPressed);
  }

  // Text-to-Speech Methods

  speak(text: string, options: Partial<TTSRequest> = {}): string {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    const request: TTSRequest = {
      id: requestId,
      text: text,
      voiceId: options.voiceId || this.config.voiceId,
      rate: options.rate || this.config.speechRate,
      pitch: options.pitch || this.config.speechPitch,
      volume: options.volume || this.config.speechVolume,
      priority: options.priority || 'normal',
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
    };
    
    // Add to queue based on priority
    if (request.priority === 'high') {
      this.ttsQueue.unshift(request);
    } else {
      this.ttsQueue.push(request);
    }
    
    this.processTTSQueue();
    return requestId;
  }

  private processTTSQueue(): void {
    if (this.isSpeaking || this.ttsQueue.length === 0) {
      return;
    }
    
    const request = this.ttsQueue.shift()!;
    this.currentTTSRequest = request;
    this.executeTTSRequest(request);
  }

  private executeTTSRequest(request: TTSRequest): void {
    if (!this.synthesis) {
      const error = new Error('Speech synthesis not available');
      this.handleTTSError(request.id, error);
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(request.text);
    
    // Set voice
    if (request.voiceId) {
      const voice = this.availableVoices.find(v => v.voiceURI === request.voiceId || v.name === request.voiceId);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.rate = request.rate || 1.0;
    utterance.pitch = request.pitch || 1.0;
    utterance.volume = request.volume || 1.0;
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.setState('speaking');
      this.emit('ttsStart', request.id);
      request.onStart?.();
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentTTSRequest = null;
      this.emit('ttsEnd', request.id);
      request.onEnd?.();
      
      // Process next item in queue
      setTimeout(() => {
        this.processTTSQueue();
        if (this.ttsQueue.length === 0 && this.shouldBeListening()) {
          this.setState('listening');
        } else if (this.ttsQueue.length === 0) {
          this.setState('idle');
        }
      }, 100);
    };
    
    utterance.onerror = (event) => {
      const error = new Error(`TTS error: ${event.error}`);
      this.handleTTSError(request.id, error);
    };
    
    this.log('Speaking:', request.text);
    this.synthesis.speak(utterance);
  }

  private handleTTSError(requestId: string, error: Error): void {
    this.logError('TTS error', error);
    this.isSpeaking = false;
    this.currentTTSRequest = null;
    this.emit('ttsError', requestId, error);
    
    // Process next item in queue
    setTimeout(() => this.processTTSQueue(), 100);
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.ttsQueue.length = 0;
      this.isSpeaking = false;
      this.currentTTSRequest = null;
      this.setState('idle');
    }
  }

  // Control Methods

  mute(): void {
    this.isMuted = true;
    this.stopListening();
    this.setState('muted');
    this.emit('microphoneToggle', false);
    this.log('Microphone muted');
  }

  unmute(): void {
    this.isMuted = false;
    this.setState('idle');
    this.emit('microphoneToggle', true);
    this.log('Microphone unmuted');
  }

  toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // Configuration Methods

  updateConfig(newConfig: Partial<VoiceRecognitionConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.log('Configuration updated:', newConfig);
    this.emit('configChanged', newConfig);
    
    // Apply configuration changes
    if (this.recognition) {
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
    }
    
    // Update hotkey listener
    if (oldConfig.hotkey !== this.config.hotkey) {
      if (this.hotkeyHandler) {
        document.removeEventListener('keydown', this.hotkeyHandler);
        document.removeEventListener('keyup', this.hotkeyHandler);
      }
      this.setupHotkeyListener();
    }
    
    this.saveConfig();
  }

  getConfig(): VoiceRecognitionConfig {
    return { ...this.config };
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('voiceRecognitionConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...parsedConfig };
        this.log('Configuration loaded from localStorage');
      }
    } catch (error) {
      this.logError('Failed to load configuration', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('voiceRecognitionConfig', JSON.stringify(this.config));
      this.log('Configuration saved to localStorage');
    } catch (error) {
      this.logError('Failed to save configuration', error);
    }
  }

  // State Management

  private setState(newState: RecognitionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.log(`State changed: ${oldState} -> ${newState}`);
      this.emit('stateChange', newState);
    }
  }

  getState(): RecognitionState {
    return this.state;
  }

  // Getters

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return [...this.availableVoices];
  }

  getCurrentVolume(): number {
    return this.volumeLevel;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  hasPermissions(): boolean {
    return this.hasPermission;
  }

  isMicrophoneMuted(): boolean {
    return this.isMuted;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  getCurrentTTSRequest(): TTSRequest | null {
    return this.currentTTSRequest;
  }

  getTTSQueueLength(): number {
    return this.ttsQueue.length;
  }

  // Cleanup

  destroy(): void {
    this.log('Destroying VoiceRecognitionService...');
    
    // Stop all operations
    this.stopListening();
    this.stopSpeaking();
    this.stopWakeWordDetection();
    
    // Clear timers
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    if (this.vadTimer) {
      clearTimeout(this.vadTimer);
    }
    
    // Remove event listeners
    if (this.hotkeyHandler) {
      document.removeEventListener('keydown', this.hotkeyHandler);
      document.removeEventListener('keyup', this.hotkeyHandler);
    }
    
    // Close audio resources
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.microphone) {
      this.microphone.disconnect();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear references
    this.recognition = null;
    this.synthesis = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.processor = null;
    
    // Reset state
    this.isInitialized = false;
    this.hasPermission = false;
    this.isMuted = false;
    this.isListening = false;
    this.isSpeaking = false;
    
    // Clear queues and buffers
    this.ttsQueue.length = 0;
    this.audioBuffer.length = 0;
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.log('VoiceRecognitionService destroyed');
  }
}

// Export singleton instance
export const voiceRecognitionService = VoiceRecognitionService.getInstance();
export type { 
  VoiceRecognitionConfig, 
  VoiceRecognitionResult, 
  VoiceActivityResult, 
  TTSRequest, 
  RecognitionState,
  VoiceRecognitionEvents 
};
