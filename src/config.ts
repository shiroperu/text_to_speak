// src/config.ts
// Centralized configuration for VoiceCast Studio.
// All constants, defaults, and tunables in one place.
// Rationale: CLAUDE.md requires no magic numbers; config centralizes them.

import type { Character, GeminiVoice } from "./types";

// --- Gemini TTS prebuilt voices (全30種) ---
export const GEMINI_VOICES: GeminiVoice[] = [
  { name: "Zephyr", desc: "明るく快活" },
  { name: "Puck", desc: "元気でエネルギッシュ" },
  { name: "Charon", desc: "知的で明瞭" },
  { name: "Kore", desc: "しっかりした決断力のある声" },
  { name: "Fenrir", desc: "興奮気味でダイナミック" },
  { name: "Leda", desc: "若々しい声" },
  { name: "Orus", desc: "堅実で力強い" },
  { name: "Aoede", desc: "なめらかで息まじり" },
  { name: "Callirrhoe", desc: "のんびりリラックス" },
  { name: "Autonoe", desc: "明るく前向き" },
  { name: "Enceladus", desc: "息まじりで柔らかい" },
  { name: "Iapetus", desc: "クリアで滑舌がよい" },
  { name: "Umbriel", desc: "穏やかで落ち着き" },
  { name: "Algieba", desc: "なめらかで心地よい" },
  { name: "Despina", desc: "なめらかで流れるような" },
  { name: "Erinome", desc: "明瞭で正確" },
  { name: "Algenib", desc: "ざらっとした質感" },
  { name: "Rasalgethi", desc: "知的でプロフェッショナル" },
  { name: "Laomedeia", desc: "明るく活発" },
  { name: "Achernar", desc: "柔らかく優しい" },
  { name: "Alnilam", desc: "しっかりと力強い" },
  { name: "Schedar", desc: "均整のとれたバランス型" },
  { name: "Gacrux", desc: "成熟した落ち着き" },
  { name: "Pulcherrima", desc: "積極的で表現豊か" },
  { name: "Achird", desc: "親しみやすい" },
  { name: "Zubenelgenubi", desc: "個性的" },
  { name: "Vindemiatrix", desc: "穏やかで優しい" },
  { name: "Sadachbia", desc: "活発でいきいき" },
  { name: "Sadaltager", desc: "博識で威厳がある" },
  { name: "Sulafat", desc: "温かく親しみやすい" },
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
