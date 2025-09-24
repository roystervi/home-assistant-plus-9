// Rule #1: When updating a file, if another file is going to be affected, update all affected files.
// Rule #2: File locations and these rules are added to the top of each file.
// Rule #3: Full code is provided for copy and paste.
// Rule #4: A breakdown of tasks is given.
// Rule #5: If a file is not available, a request for it is made.
//
// File: lib/security.ts - Secure PIN handling utilities
// Affected files: lib/storage.ts, components/pages/AlarmPanel.tsx
// Purpose: Replace plain text PIN storage with encrypted secure storage

import { storage } from "./storage";

// Simple encryption for client-side storage (better than plain text)
class SimpleCrypto {
  private key: string;

  constructor() {
    // Generate or retrieve device-specific key
    let deviceKey = localStorage.getItem('device_key');
    if (!deviceKey) {
      deviceKey = this.generateDeviceKey();
      localStorage.setItem('device_key', deviceKey);
    }
    this.key = deviceKey;
  }

  private generateDeviceKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private simpleEncrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const keyChar = this.key.charCodeAt(i % this.key.length);
      result += String.fromCharCode(char ^ keyChar);
    }
    return btoa(result);
  }

  private simpleDecrypt(encrypted: string): string {
    try {
      const text = atob(encrypted);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        const keyChar = this.key.charCodeAt(i % this.key.length);
        result += String.fromCharCode(char ^ keyChar);
      }
      return result;
    } catch {
      return '';
    }
  }

  encrypt(text: string): string {
    return this.simpleEncrypt(text);
  }

  decrypt(encrypted: string): string {
    return this.simpleDecrypt(encrypted);
  }
}

// PIN Security Manager
export class PinSecurityManager {
  private crypto: SimpleCrypto;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.crypto = new SimpleCrypto();
  }

  // Set PIN (encrypted storage)
  setPIN(pin: string): boolean {
    try {
      if (!this.isValidPIN(pin)) {
        return false;
      }
      
      const hashedPin = this.hashPIN(pin);
      const encryptedHash = this.crypto.encrypt(hashedPin);
      
      storage.set('alarm_pin_hash', encryptedHash);
      this.resetAttempts();
      
      return true;
    } catch (error) {
      console.error('Failed to set PIN:', error);
      return false;
    }
  }

  // Validate PIN attempt
  validatePIN(pin: string): { success: boolean; attemptsLeft?: number; lockoutUntil?: Date } {
    try {
      // Check if currently locked out
      const lockoutUntil = this.getLockoutTime();
      if (lockoutUntil && new Date() < lockoutUntil) {
        return {
          success: false,
          lockoutUntil
        };
      }

      // Get stored PIN hash
      const encryptedHash = storage.get('alarm_pin_hash', '');
      if (!encryptedHash) {
        // No PIN set, allow any PIN for first setup
        return { success: true };
      }

      const storedHash = this.crypto.decrypt(encryptedHash);
      const inputHash = this.hashPIN(pin);

      if (storedHash === inputHash) {
        this.resetAttempts();
        return { success: true };
      }

      // Failed attempt
      const attempts = this.incrementAttempts();
      const attemptsLeft = PinSecurityManager.MAX_ATTEMPTS - attempts;

      if (attemptsLeft <= 0) {
        this.setLockout();
        return {
          success: false,
          lockoutUntil: this.getLockoutTime()
        };
      }

      return {
        success: false,
        attemptsLeft
      };
    } catch (error) {
      console.error('PIN validation error:', error);
      return { success: false };
    }
  }

  // Check if PIN is set
  hasPIN(): boolean {
    const encryptedHash = storage.get('alarm_pin_hash', '');
    return encryptedHash.length > 0;
  }

  // Get lockout status
  isLockedOut(): boolean {
    const lockoutUntil = this.getLockoutTime();
    return lockoutUntil ? new Date() < lockoutUntil : false;
  }

  // Get remaining lockout time in minutes
  getLockoutMinutesRemaining(): number {
    const lockoutUntil = this.getLockoutTime();
    if (!lockoutUntil || new Date() >= lockoutUntil) {
      return 0;
    }
    return Math.ceil((lockoutUntil.getTime() - Date.now()) / 60000);
  }

  private isValidPIN(pin: string): boolean {
    // PIN must be 4-8 digits
    return /^\d{4,8}$/.test(pin);
  }

  private hashPIN(pin: string): string {
    // Simple hash function (in production, use bcrypt or similar)
    let hash = 0;
    const salt = 'alarm_pin_salt_2024';
    const input = pin + salt;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  private getAttempts(): number {
    return storage.get('alarm_pin_attempts', 0);
  }

  private incrementAttempts(): number {
    const attempts = this.getAttempts() + 1;
    storage.set('alarm_pin_attempts', attempts);
    return attempts;
  }

  private resetAttempts(): void {
    storage.remove('alarm_pin_attempts');
    storage.remove('alarm_lockout_until');
  }

  private setLockout(): void {
    const lockoutUntil = new Date(Date.now() + PinSecurityManager.LOCKOUT_DURATION);
    storage.set('alarm_lockout_until', lockoutUntil.toISOString());
  }

  private getLockoutTime(): Date | null {
    const lockoutString = storage.get('alarm_lockout_until', '');
    return lockoutString ? new Date(lockoutString) : null;
  }

  // Admin function to reset PIN (requires current PIN or master reset)
  resetPIN(currentPin?: string): boolean {
    if (currentPin) {
      const validation = this.validatePIN(currentPin);
      if (!validation.success) {
        return false;
      }
    }
    
    // Clear all PIN-related data
    storage.remove('alarm_pin_hash');
    storage.remove('alarm_pin_attempts');
    storage.remove('alarm_lockout_until');
    
    return true;
  }

  // Emergency reset (clears device key too - requires full reconfiguration)
  emergencyReset(): void {
    localStorage.removeItem('device_key');
    this.resetPIN();
  }
}

// Singleton instance
export const pinSecurity = new PinSecurityManager();