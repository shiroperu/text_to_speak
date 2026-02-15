// src/types.ts
// Central type definitions for VoiceCast Studio.
// All domain models, API-related types, and shared interfaces live here.
//
// ElevenLabs TTS API (v3) migration:
// - GeminiVoice → ElevenLabsVoice (voice_id based, fetched dynamically from API)
// - Character: removed pitch, age, directorsNotes (not controllable via ElevenLabs)
// - Added VoiceSettings for ElevenLabs voice_settings parameter
// - Added AudioTag / AudioTagInfo for v3 audio tag system (replaces EmotionTag/EmotionTagModifier)
// - Added ElevenLabsVoiceResponse for GET /voices API response

// ============================================================
// Voice parameter types (used in Character → VoiceSettings conversion)
// ============================================================

/** Speed setting for character voice → maps to voice_settings.speed */
export type Speed = "slow" | "normal" | "fast";

/** Emotion intensity setting → maps to stability (inverse) + style (base) */
export type EmotionIntensity = "small" | "medium" | "large";

/** Voice quality setting → maps to similarity_boost + use_speaker_boost */
export type VoiceQuality = "clear" | "breathy" | "nasal" | "husky";

/** Personality setting → adds bonus to style value */
export type Personality = "calm" | "cheerful" | "shy" | "aggressive";

// ============================================================
// ElevenLabs voice definition (fetched from API)
// ============================================================

/**
 * ElevenLabs voice entry for the voice selector UI.
 * Fetched dynamically from GET /v1/voices when API key is set.
 */
export interface ElevenLabsVoice {
  /** ElevenLabs voice ID (used in API URL path) */
  voice_id: string;
  /** Display name for the voice */
  name: string;
  /** Voice metadata labels (e.g. accent, age, gender, description, use_case) */
  labels: Record<string, string>;
  /** URL to a sample audio clip for this voice */
  preview_url: string;
  /** Voice category: "premade", "cloned", "generated", etc. */
  category: string;
}

/**
 * Response shape from ElevenLabs GET /v1/voices endpoint.
 * Contains the full list of available voices for the authenticated user.
 */
export interface ElevenLabsVoiceResponse {
  voices: ElevenLabsVoice[];
}

// ============================================================
// ElevenLabs voice_settings
// ============================================================

/**
 * ElevenLabs voice_settings object.
 * Built from Character UI parameters via buildVoiceSettings().
 * Sent directly in the TTS API request body.
 */
export interface VoiceSettings {
  /** Voice stability (0.0-1.0). Higher = more stable/monotone, lower = more expressive/variable */
  stability: number;
  /** Similarity to original voice (0.0-1.0). Higher = more faithful but may introduce artifacts */
  similarity_boost: number;
  /** Style exaggeration (0.0-1.0). Higher = more expressive but less stable */
  style: number;
  /** Speaker clarity boost. Enhances voice clarity at slight quality cost */
  use_speaker_boost: boolean;
  /** Speech speed (0.7-1.2). 1.0 = normal speed */
  speed: number;
}

// ============================================================
// Audio tag system (ElevenLabs v3)
// ============================================================

/**
 * Audio tag identifiers for ElevenLabs v3 model.
 * Used in script text as [angry], [whispers], etc.
 * v3 model interprets these tags directly — no numeric voice_settings adjustment needed.
 *
 * Emotion tags (12): angry, sad, happy, excited, calm, fearful,
 *   nervous, frustrated, curious, sarcastic, mischievously, sorrowful
 * Performance tags (6): whispers, laughs, sighs, crying, gasps, shout
 */
export type AudioTag =
  | "angry"
  | "sad"
  | "happy"
  | "excited"
  | "calm"
  | "fearful"
  | "nervous"
  | "frustrated"
  | "curious"
  | "sarcastic"
  | "mischievously"
  | "sorrowful"
  | "whispers"
  | "laughs"
  | "sighs"
  | "crying"
  | "gasps"
  | "shout";

/**
 * Metadata for an audio tag (UI display and categorization).
 * v3 does not need numeric modifiers — the model interprets tags directly.
 */
export interface AudioTagInfo {
  /** Japanese label for UI display */
  label: string;
  /** Tag category for UI grouping */
  category: "emotion" | "performance";
}

// ============================================================
// Character configuration
// ============================================================

/**
 * Character configuration for voice generation.
 * UI parameters (speed, emotionIntensity, voiceQuality, personality)
 * are converted to ElevenLabs voice_settings via buildVoiceSettings().
 *
 * voiceId is selected from the dynamically-fetched voice list.
 * Empty string ("") means no voice has been selected yet.
 *
 * Note: pitch, age, directorsNotes were removed in the ElevenLabs migration
 * because ElevenLabs does not support these controls.
 */
export interface Character {
  id: string;
  name: string;
  /** ElevenLabs voice ID (replaces Gemini's voiceName). Empty = not yet selected. */
  voiceId: string;
  speed: Speed;
  emotionIntensity: EmotionIntensity;
  voiceQuality: VoiceQuality;
  personality: Personality;
}

// ============================================================
// Dictionary, Script, and Export types (unchanged from Gemini era)
// ============================================================

/** Dictionary entry for pronunciation correction */
export interface DictionaryEntry {
  word: string;
  reading: string;
}

/** Parsed script line from uploaded .txt file */
export interface ScriptLine {
  speaker: string;
  text: string;
  index: number;
}

/** Speaker-to-character mapping (speaker name -> character id) */
export type SpeakerMap = Record<string, string>;

/** Audio generation progress state */
export interface GenerationProgress {
  current: number;
  total: number;
  currentSpeaker: string;
}

/** Character export/import JSON format */
export interface CharacterExport {
  version: string;
  characters: Character[];
  dictionary?: DictionaryEntry[];
}

/** Dictionary export/import JSON format */
export interface DictionaryExport {
  version: string;
  entries: DictionaryEntry[];
}

/** User data stored in Firestore (one document per user) */
export interface UserData {
  apiKey: string;
  characters: Character[];
  dictionary: DictionaryEntry[];
}
