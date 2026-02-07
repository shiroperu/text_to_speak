// src/types.ts
// Central type definitions for VoiceCast Studio.
// All domain models, API-related types, and shared interfaces live here.

/** Pitch setting for character voice */
export type Pitch = "low" | "mid" | "high";

/** Speed setting for character voice */
export type Speed = "slow" | "normal" | "fast";

/** Emotion intensity setting */
export type EmotionIntensity = "small" | "medium" | "large";

/** Voice quality setting */
export type VoiceQuality = "clear" | "breathy" | "nasal" | "husky";

/** Age impression setting */
export type Age = "child" | "teen" | "adult";

/** Personality setting */
export type Personality = "calm" | "cheerful" | "shy" | "aggressive";

/** Gemini TTS prebuilt voice entry */
export interface GeminiVoice {
  name: string;
  desc: string;
}

/** Character configuration — matches JSON export/import schema */
export interface Character {
  id: string;
  name: string;
  voiceName: string;
  pitch: Pitch;
  speed: Speed;
  emotionIntensity: EmotionIntensity;
  voiceQuality: VoiceQuality;
  age: Age;
  personality: Personality;
  directorsNotes: string;
}

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

/** Generation plan step — single or multi-speaker */
export interface GenerationStep {
  type: "single" | "multi";
  lines: ScriptLine[];
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
