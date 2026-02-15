// src/utils/migration.ts
// Data migration for Gemini TTS → ElevenLabs TTS format change.
//
// Old (Gemini) Character format had:
//   voiceName (string), pitch, age, directorsNotes
// New (ElevenLabs) Character format has:
//   voiceId (string, empty = unselected)
//   — pitch, age, directorsNotes removed
//
// Migration detects old format by checking for voiceName or pitch fields,
// strips removed fields, and sets voiceId to "" (user must re-select from
// ElevenLabs voice list since the voice libraries are completely different).
//
// Applied in App.tsx (localStorage) and useFirestoreSync.ts (Firestore).

import type { Character } from "@/types";
import {
  DEFAULT_CHARACTER,
  SPEED_OPTIONS,
  EMOTION_OPTIONS,
  QUALITY_OPTIONS,
  PERSONALITY_OPTIONS,
} from "@/config";

/**
 * Old Gemini-era character format (used for detection only).
 * Fields that existed in the old format but no longer in Character.
 */
interface LegacyCharacter {
  id?: string;
  name?: string;
  voiceName?: string;
  voiceId?: string;
  pitch?: string;
  age?: string;
  directorsNotes?: string;
  speed?: string;
  emotionIntensity?: string;
  voiceQuality?: string;
  personality?: string;
}

/** Check if a value is a valid member of a readonly options array */
function isValidOption<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/**
 * Check if a character object uses the old Gemini format.
 * Detects by presence of legacy fields (voiceName, pitch, age, directorsNotes).
 */
function isLegacyCharacter(char: unknown): boolean {
  if (typeof char !== "object" || char === null) return false;
  const obj = char as Record<string, unknown>;
  return (
    "voiceName" in obj ||
    "pitch" in obj ||
    "age" in obj ||
    "directorsNotes" in obj
  );
}

/**
 * Migrate a single character from Gemini format to ElevenLabs format.
 * - Removes: voiceName, pitch, age, directorsNotes
 * - Adds: voiceId = "" (user must re-select voice)
 * - Preserves: id, name, speed, emotionIntensity, voiceQuality, personality
 * - Falls back to DEFAULT_CHARACTER values for invalid or missing fields
 */
function migrateCharacter(legacy: LegacyCharacter): Character {
  return {
    id: legacy.id ?? DEFAULT_CHARACTER.id,
    name: legacy.name ?? DEFAULT_CHARACTER.name,
    voiceId: legacy.voiceId ?? "",
    speed: isValidOption(legacy.speed, SPEED_OPTIONS)
      ? legacy.speed : DEFAULT_CHARACTER.speed,
    emotionIntensity: isValidOption(legacy.emotionIntensity, EMOTION_OPTIONS)
      ? legacy.emotionIntensity : DEFAULT_CHARACTER.emotionIntensity,
    voiceQuality: isValidOption(legacy.voiceQuality, QUALITY_OPTIONS)
      ? legacy.voiceQuality : DEFAULT_CHARACTER.voiceQuality,
    personality: isValidOption(legacy.personality, PERSONALITY_OPTIONS)
      ? legacy.personality : DEFAULT_CHARACTER.personality,
  };
}

/**
 * Migrate a character array if any entries use the old Gemini format.
 * Returns the array unchanged if no migration is needed.
 * If migration is performed, logs a message to the console.
 */
export function migrateCharacters(characters: unknown[]): Character[] {
  if (!Array.isArray(characters) || characters.length === 0) {
    return [];
  }

  const needsMigration = characters.some(isLegacyCharacter);
  if (!needsMigration) {
    // Already in new format — return as-is
    return characters as Character[];
  }

  console.info(
    "[Migration] Gemini → ElevenLabs: %d character(s) migrated. Voice re-selection required.",
    characters.length,
  );

  return characters.map((char) =>
    isLegacyCharacter(char) ? migrateCharacter(char as LegacyCharacter) : (char as Character),
  );
}
