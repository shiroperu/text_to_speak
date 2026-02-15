// src/config.ts
// Centralized configuration for VoiceCast Studio.
// All constants, defaults, and tunables in one place.
// Rationale: CLAUDE.md requires no magic numbers; config centralizes them.
//
// ElevenLabs migration:
// - Voice list is now fetched dynamically from API (no hardcoded list)
// - GEMINI_TTS_MODEL / GEMINI_API_BASE → ELEVENLABS equivalents
// - Removed PITCH_OPTIONS, AGE_OPTIONS (not controllable via ElevenLabs)
// - Added EMOTION_TAGS for per-line emotion control
// - PCM constants (SAMPLE_RATE etc.) retained — using pcm_24000 output format

import type { Character, EmotionTag, EmotionTagModifier } from "./types";

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

/** Primary model — high quality, stable, good Japanese support */
export const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
/** API base URL (v1 endpoint) */
export const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
/** PCM output format — 24kHz 16-bit signed little-endian mono */
export const ELEVENLABS_OUTPUT_FORMAT = "pcm_24000";
/** User's own voices endpoint (relative to ELEVENLABS_API_BASE) */
export const ELEVENLABS_VOICES_ENDPOINT = "/voices";

// ============================================================
// Emotion tag system
// ============================================================
// Tags can be embedded in script text to dynamically adjust voice_settings.
// Format: [emotion:angry], [whisper], etc. — placed at the start of a line.
// See migration plan section 7.7 for full specification.

export const EMOTION_TAGS: Record<EmotionTag, EmotionTagModifier> = {
  "emotion:angry": {
    stability: -0.15,
    style: +0.20,
    speed: null,
    label: "怒り",
  },
  "emotion:sad": {
    stability: -0.10,
    style: +0.10,
    speed: 0.9,
    label: "悲しみ",
  },
  "emotion:happy": {
    stability: -0.05,
    style: +0.15,
    speed: null,
    label: "喜び",
  },
  "emotion:excited": {
    stability: -0.15,
    style: +0.25,
    speed: 1.1,
    label: "興奮",
  },
  "emotion:calm": {
    stability: +0.10,
    style: -0.05,
    speed: 0.95,
    label: "穏やか",
  },
  "emotion:fearful": {
    stability: -0.10,
    style: +0.10,
    speed: 1.05,
    label: "恐怖",
  },
  "whisper": {
    stability: +0.20,
    style: -0.10,
    speed: 0.9,
    label: "ささやき",
  },
  "shout": {
    stability: -0.20,
    style: +0.30,
    speed: 1.1,
    label: "叫び",
  },
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
