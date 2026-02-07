// src/utils/storage.ts
// localStorage persistence helpers for VoiceCast Studio.
// Saves and loads API key, characters, and dictionary automatically.
// All data stays in the user's browser — nothing is sent externally.

const STORAGE_KEYS = {
  apiKey: "voicecast_apiKey",
  characters: "voicecast_characters",
  dictionary: "voicecast_dictionary",
} as const;

/** Load a string value from localStorage */
export function loadString(key: keyof typeof STORAGE_KEYS): string {
  try {
    return localStorage.getItem(STORAGE_KEYS[key]) ?? "";
  } catch {
    return "";
  }
}

/** Save a string value to localStorage */
export function saveString(key: keyof typeof STORAGE_KEYS, value: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], value);
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}

/** Load a JSON value from localStorage */
export function loadJson<T>(key: keyof typeof STORAGE_KEYS, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Save a JSON value to localStorage */
export function saveJson(key: keyof typeof STORAGE_KEYS, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}
