import { UserProfile } from "../types";

export interface UserSecurityConfig {
  userId: string;
  passwordHash?: string; // SHA-256 encrypted/hashed password
  isPasswordSet: boolean;
  enableFingerprint: boolean;
  enableFaceUnlock: boolean;
  autoLockMinutes: number; // 1, 5, 10, 15
  rememberMe: boolean; // false = ask every session/reopen, true = remember unless idle timeout
  lastLoginAt?: string;
  lastBackupAt?: string;
}

export interface SecurityFailedLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  reason: string;
}

export interface AppSecurityStore {
  userConfigs: Record<string, UserSecurityConfig>;
  failedLogs: SecurityFailedLog[];
}

const SECURITY_STORAGE_KEY = "dukan-app-security-v1";

/**
 * SHA-256 Hash algorithm using Web Crypto API to ensure passwords are never stored in plaintext
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`dukan_salt_key_2026_${plainText}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    // Fallback simple hash string if crypto.subtle is restricted
    let hash = 0;
    const str = `dukan_salt_key_2026_${plainText}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `enc_${Math.abs(hash).toString(16)}`;
  }
}

/**
 * Default security config for a user
 */
export function getDefaultUserSecurityConfig(userId: string): UserSecurityConfig {
  return {
    userId,
    isPasswordSet: false,
    enableFingerprint: false,
    enableFaceUnlock: false,
    autoLockMinutes: 5,
    rememberMe: false,
    lastLoginAt: new Date().toISOString(),
  };
}

/**
 * Load Security Data from localStorage
 */
export function loadSecurityStore(): AppSecurityStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          userConfigs: parsed.userConfigs || {},
          failedLogs: parsed.failedLogs || [],
        };
      }
    }
  } catch (e) {
    console.error("Error loading security store:", e);
  }

  return {
    userConfigs: {},
    failedLogs: [],
  };
}

/**
 * Save Security Data to localStorage
 */
export function saveSecurityStore(store: AppSecurityStore): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(store));
    }
  } catch (e) {
    console.error("Error saving security store:", e);
  }
}

/**
 * Check if WebAuthn / Biometrics (Fingerprint / Face ID) is supported on device & browser
 */
export async function checkBiometricsSupport(): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
}> {
  if (
    typeof window === "undefined" ||
    !window.PublicKeyCredential ||
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return { supported: false, platformAuthenticator: false };
  }

  try {
    const isAvailable =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { supported: true, platformAuthenticator: isAvailable };
  } catch {
    return { supported: true, platformAuthenticator: false };
  }
}

/**
 * Trigger Biometric WebAuthn prompt
 */
export async function authenticateWithBiometrics(userName: string): Promise<{
  success: boolean;
  message?: string;
}> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return {
      success: false,
      message: "ئامێرەکە یان وێبگەڕەکە پشتگیری پەنجەمۆر و ناسێنەرەوەی دەم و چاو ناکات.",
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: "preferred",
    };

    // Prompt biometric authentication
    const credential = await navigator.credentials.get({ publicKey });
    if (credential) {
      return { success: true };
    }
    return { success: false, message: "پەنجەمۆر/ناسێنەرەوە ڕەتکرایەوە." };
  } catch (err: any) {
    console.warn("Biometric authentication error/canceled:", err);
    // If WebAuthn fails due to missing credentials, attempt a simulated secure biometric prompt or return false
    return {
      success: false,
      message: err.name === "NotAllowedError" ? "پرۆسەی پەنجەمۆر پووچەڵکرایەوە." : "پەنجەمۆر سەرکەوتوو نەبوو.",
    };
  }
}

/**
 * Add a failed login attempt log
 */
export function addFailedLoginLog(
  userId: string,
  userName: string,
  reason: string = "پاسووردی هەڵە"
): SecurityFailedLog[] {
  const store = loadSecurityStore();
  const newLog: SecurityFailedLog = {
    id: `log_${Date.now()}`,
    userId,
    userName,
    timestamp: new Date().toISOString(),
    reason,
  };

  const updatedLogs = [newLog, ...store.failedLogs].slice(0, 30); // Keep last 30 logs
  store.failedLogs = updatedLogs;
  saveSecurityStore(store);
  return updatedLogs;
}
