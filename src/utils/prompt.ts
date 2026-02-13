// src/utils/prompt.ts
// Voice settings construction and text processing for ElevenLabs TTS API.
//
// This file replaces the Gemini prompt-building logic with:
// 1. buildVoiceSettings() — converts Character UI params → ElevenLabs voice_settings
// 2. parseEmotionTag() — extracts emotion tags from script text
// 3. applyEmotionModifier() — adjusts voice_settings based on detected emotion tag
// 4. prepareTextForTts() — applies dictionary + sanitization to text before API call
//
// sanitizeForTts() and applyDictionary() are retained from the Gemini era.

import type {
  Character,
  DictionaryEntry,
  VoiceSettings,
  EmotionTag,
  EmotionTagModifier,
  Speed,
  EmotionIntensity,
  VoiceQuality,
  Personality,
} from "@/types";
import {
  EMOTION_TAGS,
  VOICE_SETTING_MIN,
  VOICE_SETTING_MAX,
  SPEED_MIN,
  SPEED_MAX,
} from "@/config";

// ============================================================
// Character → VoiceSettings conversion maps
// ============================================================
// These maps translate discrete UI parameter values into numeric
// ElevenLabs voice_settings values. See migration plan section 5.2.

/** Speed UI value → voice_settings.speed */
const SPEED_MAP: Record<Speed, number> = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.15,
};

/** EmotionIntensity → voice_settings.stability (inverse relationship) */
const EMOTION_STABILITY_MAP: Record<EmotionIntensity, number> = {
  small: 0.75,
  medium: 0.50,
  large: 0.30,
};

/** EmotionIntensity → voice_settings.style (base value, before personality bonus) */
const EMOTION_STYLE_MAP: Record<EmotionIntensity, number> = {
  small: 0.0,
  medium: 0.15,
  large: 0.40,
};

/** Personality → additive bonus to style value */
const PERSONALITY_STYLE_BONUS: Record<Personality, number> = {
  calm: 0.0,
  cheerful: 0.15,
  shy: 0.05,
  aggressive: 0.25,
};

/** VoiceQuality → voice_settings.similarity_boost */
const QUALITY_SIMILARITY_MAP: Record<VoiceQuality, number> = {
  clear: 0.80,
  breathy: 0.60,
  nasal: 0.70,
  husky: 0.65,
};

/** VoiceQuality → voice_settings.use_speaker_boost */
const QUALITY_BOOST_MAP: Record<VoiceQuality, boolean> = {
  clear: true,
  breathy: false,
  nasal: true,
  husky: false,
};

// ============================================================
// Emotion tag regex
// ============================================================
// Matches tags like [emotion:angry], [whisper], [shout] at the start of text.
// The tag must be followed by a space (or end of string) to avoid false matches.
// Captures the tag content without brackets.

const EMOTION_TAG_REGEX = /^\[(emotion:\w+|\w+)\]\s*/;

// ============================================================
// Public API
// ============================================================

/**
 * Convert Character UI parameters into an ElevenLabs voice_settings object.
 * Maps 4 discrete UI params (speed, emotionIntensity, voiceQuality, personality)
 * to 5 numeric API params (stability, similarity_boost, style, use_speaker_boost, speed).
 *
 * style = emotionIntensity base + personality bonus, clamped to [0.0, 1.0].
 */
export function buildVoiceSettings(char: Character): VoiceSettings {
  const styleBase = EMOTION_STYLE_MAP[char.emotionIntensity];
  const styleBonus = PERSONALITY_STYLE_BONUS[char.personality];

  return {
    stability: EMOTION_STABILITY_MAP[char.emotionIntensity],
    similarity_boost: QUALITY_SIMILARITY_MAP[char.voiceQuality],
    style: clamp(styleBase + styleBonus, VOICE_SETTING_MIN, VOICE_SETTING_MAX),
    use_speaker_boost: QUALITY_BOOST_MAP[char.voiceQuality],
    speed: SPEED_MAP[char.speed],
  };
}

/**
 * Parse an emotion tag from the beginning of a script line.
 * Returns the cleaned text (tag removed) and the matching modifier if found.
 *
 * Examples:
 *   "[emotion:angry] そんなことは許さない！"
 *     → { cleanText: "そんなことは許さない！", modifier: { stability: -0.15, ... } }
 *   "普通のテキスト"
 *     → { cleanText: "普通のテキスト", modifier: null }
 */
export function parseEmotionTag(text: string): {
  cleanText: string;
  modifier: EmotionTagModifier | null;
} {
  const match = text.match(EMOTION_TAG_REGEX);
  if (!match) {
    return { cleanText: text, modifier: null };
  }

  const tagContent = match[1] as string;
  // Check if the captured tag is a valid emotion tag
  const modifier = EMOTION_TAGS[tagContent as EmotionTag];
  if (!modifier) {
    // Unknown tag — leave text as-is (don't strip it)
    return { cleanText: text, modifier: null };
  }

  // Remove the tag from the text
  const cleanText = text.slice(match[0].length);
  return { cleanText, modifier };
}

/**
 * Apply an emotion tag modifier to base voice_settings.
 * stability and style are adjusted additively, then clamped.
 * speed is overridden (absolute value) if the modifier specifies one,
 * otherwise the base speed is kept.
 *
 * use_speaker_boost and similarity_boost are not affected by emotion tags.
 */
export function applyEmotionModifier(
  baseSettings: VoiceSettings,
  modifier: EmotionTagModifier,
): VoiceSettings {
  return {
    ...baseSettings,
    stability: clamp(
      baseSettings.stability + modifier.stability,
      VOICE_SETTING_MIN,
      VOICE_SETTING_MAX,
    ),
    style: clamp(
      baseSettings.style + modifier.style,
      VOICE_SETTING_MIN,
      VOICE_SETTING_MAX,
    ),
    speed: modifier.speed !== null
      ? clamp(modifier.speed, SPEED_MIN, SPEED_MAX)
      : baseSettings.speed,
  };
}

/**
 * Prepare script text for the ElevenLabs TTS API.
 * Applies dictionary readings (inline injection) and sanitization.
 * This is the text that goes into the request body's `text` field.
 */
export function prepareTextForTts(
  lineText: string,
  dictionary: DictionaryEntry[],
): string {
  const withReadings = dictionary.length > 0
    ? applyDictionary(lineText, dictionary)
    : lineText;
  return sanitizeForTts(withReadings);
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Sanitize text for TTS: remove problematic characters that can cause issues.
 * - Literal \uXXXX escape sequences → removed
 * - Control characters (U+0000-U+001F except \n) → removed
 * - Zero-width / invisible Unicode chars → removed
 */
function sanitizeForTts(text: string): string {
  return text
    // Literal \uXXXX escape sequences (4+ hex digits)
    .replace(/\\u[0-9a-fA-F]{4,}/g, "")
    // Control characters except newline
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, "")
    // Zero-width and invisible Unicode characters
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\uFFF9-\uFFFB]/g, "");
}

/**
 * Apply dictionary entries to text by injecting readings in parentheses.
 * Only applies entries whose word actually appears in the text.
 * e.g. "築古マンション" → "築古（ちくふる）マンション"
 */
function applyDictionary(text: string, dictionary: DictionaryEntry[]): string {
  let result = text;
  for (const entry of dictionary) {
    if (result.includes(entry.word)) {
      result = result.replaceAll(entry.word, `${entry.word}（${entry.reading}）`);
    }
  }
  return result;
}

/** Clamp a numeric value to [min, max] range */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
