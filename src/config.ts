// src/config.ts
// Centralized configuration for VoiceCast Studio.
// All constants, defaults, and tunables in one place.
// Rationale: CLAUDE.md requires no magic numbers; config centralizes them.

import type { Character, GeminiVoice } from "./types";

// --- Gemini TTS prebuilt voices (全30種) ---
export const GEMINI_VOICES: GeminiVoice[] = [
  { name: "Zephyr", desc: "Bright, upbeat" },
  { name: "Puck", desc: "Upbeat, energetic" },
  { name: "Charon", desc: "Informative, clear" },
  { name: "Kore", desc: "Firm, decisive" },
  { name: "Fenrir", desc: "Excitable, dynamic" },
  { name: "Leda", desc: "Youthful" },
  { name: "Orus", desc: "Firm, decisive" },
  { name: "Aoede", desc: "Smooth, breathy" },
  { name: "Callirrhoe", desc: "Easy-going, relaxed" },
  { name: "Autonoe", desc: "Bright, optimistic" },
  { name: "Enceladus", desc: "Breathy, soft" },
  { name: "Iapetus", desc: "Clear, articulate" },
  { name: "Umbriel", desc: "Easy-going, calm" },
  { name: "Algieba", desc: "Smooth, pleasant" },
  { name: "Despina", desc: "Smooth, flowing" },
  { name: "Erinome", desc: "Clear, precise" },
  { name: "Algenib", desc: "Gravelly texture" },
  { name: "Rasalgethi", desc: "Informative, professional" },
  { name: "Laomedeia", desc: "Upbeat, lively" },
  { name: "Achernar", desc: "Soft, gentle" },
  { name: "Alnilam", desc: "Firm, strong" },
  { name: "Schedar", desc: "Even, balanced" },
  { name: "Gacrux", desc: "Mature, experienced" },
  { name: "Pulcherrima", desc: "Forward, expressive" },
  { name: "Achird", desc: "Friendly, approachable" },
  { name: "Zubenelgenubi", desc: "Unique" },
  { name: "Vindemiatrix", desc: "Gentle, kind" },
  { name: "Sadachbia", desc: "Lively, animated" },
  { name: "Sadaltager", desc: "Knowledgeable, authoritative" },
  { name: "Sulafat", desc: "Warm, welcoming" },
];

// --- Character parameter options ---
export const PITCH_OPTIONS = ["low", "mid", "high"] as const;
export const SPEED_OPTIONS = ["slow", "normal", "fast"] as const;
export const EMOTION_OPTIONS = ["small", "medium", "large"] as const;
export const QUALITY_OPTIONS = ["clear", "breathy", "nasal", "husky"] as const;
export const AGE_OPTIONS = ["child", "teen", "adult"] as const;
export const PERSONALITY_OPTIONS = ["calm", "cheerful", "shy", "aggressive"] as const;

// --- Default character template ---
export const DEFAULT_CHARACTER: Character = {
  id: "",
  name: "",
  voiceName: "Kore",
  pitch: "mid",
  speed: "normal",
  emotionIntensity: "medium",
  voiceQuality: "clear",
  age: "adult",
  personality: "calm",
  directorsNotes: "",
};

// --- Audio constants (PCM 16bit 24kHz mono) ---
export const SAMPLE_RATE = 24000;
export const CHANNELS = 1;
export const BITS_PER_SAMPLE = 16;

// --- Generation defaults ---
export const DEFAULT_PAUSE_MS = 500;
export const DEFAULT_REQUEST_DELAY_SEC = 1.0;
export const MAX_RETRIES = 3;
export const PREVIEW_TEXT = "こんにちは、テスト音声です。本日はよろしくお願いします。";

// --- Gemini API ---
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// --- UI: character color palette for visual distinction ---
export const CHARACTER_COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];
