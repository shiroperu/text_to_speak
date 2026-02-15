// src/config.ts
// Centralized configuration for VoiceCast Studio.
// All constants, defaults, and tunables in one place.
// Rationale: CLAUDE.md requires no magic numbers; config centralizes them.
//
// ElevenLabs v3 migration:
// - Voice list is now fetched dynamically from API (no hardcoded list)
// - Model: eleven_v3 (upgraded from eleven_multilingual_v2)
// - AUDIO_TAGS: v3 audio tags replace v2 emotion tags (model interprets tags directly)
// - PCM constants (SAMPLE_RATE etc.) retained — using pcm_24000 output format

import type { Character, AudioTag, AudioTagInfo } from "./types";

// ============================================================
// Character parameter options (UI selector choices)
// ============================================================
// Note: PITCH_OPTIONS and AGE_OPTIONS removed — ElevenLabs cannot control these.
// Voice pitch/age is determined by voice_id selection.

export const SPEED_OPTIONS = ["slow", "normal", "fast"] as const;
export const EMOTION_OPTIONS = ["small", "medium", "large"] as const;
export const QUALITY_OPTIONS = ["clear", "breathy", "nasal", "husky"] as const;
export const PERSONALITY_OPTIONS = ["calm", "cheerful", "shy", "aggressive"] as const;

// ============================================================
// Default character template
// ============================================================
// voiceId is empty — user selects from the dynamically-fetched voice list.

export const DEFAULT_CHARACTER: Character = {
  id: "",
  name: "",
  voiceId: "",
  speed: "normal",
  emotionIntensity: "medium",
  voiceQuality: "clear",
  personality: "calm",
};

// ============================================================
// Audio constants (PCM 16bit 24kHz mono)
// ============================================================
// Retained because ElevenLabs pcm_24000 output uses the same format.

export const SAMPLE_RATE = 24000;
export const CHANNELS = 1;
export const BITS_PER_SAMPLE = 16;

// ============================================================
// Generation defaults
// ============================================================

export const DEFAULT_PAUSE_MS = 500;
/** ElevenLabs free tier allows 2 concurrent requests — 1.5s interval is conservative */
export const DEFAULT_REQUEST_DELAY_SEC = 1.5;
export const MAX_RETRIES = 3;
export const PREVIEW_TEXT = "こんにちは、テスト音声です。本日はよろしくお願いします。";

// ============================================================
// ElevenLabs API
// ============================================================

/** Primary model — ElevenLabs v3 with audio tag support */
export const ELEVENLABS_MODEL_ID = "eleven_v3";
/** API base URL (v1 endpoint) */
export const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
/** PCM output format — 24kHz 16-bit signed little-endian mono */
export const ELEVENLABS_OUTPUT_FORMAT = "pcm_24000";
/** Maximum text length for v3 model (characters) */
export const ELEVENLABS_MAX_CHARS = 5000;
/** User's own voices endpoint (relative to ELEVENLABS_API_BASE) */
export const ELEVENLABS_VOICES_ENDPOINT = "/voices";

// ============================================================
// Audio tag system (ElevenLabs v3)
// ============================================================
// v3 audio tags are embedded in script text as [angry], [whispers], etc.
// The v3 model interprets these tags directly — no numeric voice_settings adjustment needed.
// Tags are placed at the start of a line and kept in the TTS text.

export const AUDIO_TAGS: Record<AudioTag, AudioTagInfo> = {
  // --- Emotion tags (12) ---
  angry:         { label: "怒り",     category: "emotion" },
  sad:           { label: "悲しみ",   category: "emotion" },
  happy:         { label: "喜び",     category: "emotion" },
  excited:       { label: "興奮",     category: "emotion" },
  calm:          { label: "穏やか",   category: "emotion" },
  fearful:       { label: "恐怖",     category: "emotion" },
  nervous:       { label: "不安",     category: "emotion" },
  frustrated:    { label: "苛立ち",   category: "emotion" },
  curious:       { label: "好奇心",   category: "emotion" },
  sarcastic:     { label: "皮肉",     category: "emotion" },
  mischievously: { label: "いたずら", category: "emotion" },
  sorrowful:     { label: "哀愁",     category: "emotion" },
  // --- Performance tags (6) ---
  whispers:      { label: "ささやき",   category: "performance" },
  laughs:        { label: "笑い",       category: "performance" },
  sighs:         { label: "ため息",     category: "performance" },
  crying:        { label: "泣き",       category: "performance" },
  gasps:         { label: "息をのむ",   category: "performance" },
  shout:         { label: "叫び",       category: "performance" },
};

// ============================================================
// Voice settings parameter ranges (for clamping)
// ============================================================

/** Minimum value for stability, similarity_boost, style (0.0-1.0 range) */
export const VOICE_SETTING_MIN = 0.0;
/** Maximum value for stability, similarity_boost, style (0.0-1.0 range) */
export const VOICE_SETTING_MAX = 1.0;
/** Minimum speed value (ElevenLabs constraint) */
export const SPEED_MIN = 0.7;
/** Maximum speed value (ElevenLabs constraint) */
export const SPEED_MAX = 1.2;

// ============================================================
// UI: character color palette for visual distinction
// ============================================================

export const CHARACTER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];
