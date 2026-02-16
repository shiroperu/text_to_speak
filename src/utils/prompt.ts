// src/utils/prompt.ts
// Voice settings construction and text processing for ElevenLabs TTS API (v3).
//
// This file provides:
// 1. buildVoiceSettings() — converts Character UI params → ElevenLabs voice_settings
// 2. extractAudioTag() — extracts v3 audio tags from script text (tags stay in TTS text)
// 3. prepareTextForTts() — applies dictionary + sanitization to clean text
// 4. prepareTextWithAudioTag() — applies dictionary + sanitization while preserving audio tags
//
// v3 migration: applyEmotionModifier() removed — v3 model interprets audio tags directly.
// sanitizeForTts() and applyDictionary() are retained from earlier versions.

import type {
  Character,
  DictionaryEntry,
  VoiceSettings,
  Speed,
  EmotionIntensity,
  VoiceQuality,
  Personality,
} from "@/types";
import {
  AUDIO_TAGS,
  VOICE_SETTING_MIN,
  VOICE_SETTING_MAX,
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

/** EmotionIntensity → voice_settings.stability
 * v3 accepts only 3 values: 0.0 (Creative), 0.5 (Natural), 1.0 (Robust).
 * All levels set to Creative (0.0) for maximum emotional expressiveness. */
const EMOTION_STABILITY_MAP: Record<EmotionIntensity, number> = {
  small: 0.0,
  medium: 0.0,
  large: 0.0,
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
// Audio tag regex (v3)
// ============================================================
// Matches v3 audio tags like [angry], [whispers], [shout] at the start of text.
// The tag must be followed by a space (or end of string) to avoid false matches.
// Captures the tag content without brackets.

export const AUDIO_TAG_REGEX = /^\[(\w+)\]\s*/;

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
 * Extract a v3 audio tag from the beginning of a script line.
 * Unlike v2, the tag is NOT removed from the TTS text — v3 model interprets it directly.
 *
 * Returns:
 * - cleanText: tag removed (for previous_text / next_text continuity)
 * - textWithTag: original text with tag preserved (for TTS API text field)
 *
 * Examples:
 *   "[angry] そんなことは許さない！"
 *     → { cleanText: "そんなことは許さない！", textWithTag: "[angry] そんなことは許さない！" }
 *   "普通のテキスト"
 *     → { cleanText: "普通のテキスト", textWithTag: "普通のテキスト" }
 */
export function extractAudioTag(text: string): {
  cleanText: string;
  textWithTag: string;
} {
  const match = text.match(AUDIO_TAG_REGEX);
  if (!match) {
    return { cleanText: text, textWithTag: text };
  }

  const tagContent = match[1] as string;
  // Check if the captured tag is a valid v3 audio tag
  if (!(tagContent in AUDIO_TAGS)) {
    // Unknown tag — treat as plain text
    return { cleanText: text, textWithTag: text };
  }

  // cleanText: tag removed (for prev/next context)
  const cleanText = text.slice(match[0].length);
  // textWithTag: original text preserved (v3 model reads the tag)
  return { cleanText, textWithTag: text };
}

/**
 * Prepare script text for the ElevenLabs TTS API (clean text without tags).
 * Applies dictionary readings (inline injection) and sanitization.
 * Used for previous_text / next_text context fields.
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

/**
 * Prepare script text with audio tag preserved for TTS API text field.
 * Applies dictionary + sanitization to the text portion while keeping
 * the [tag] prefix intact for v3 model interpretation.
 */
export function prepareTextWithAudioTag(
  textWithTag: string,
  cleanText: string,
  dictionary: DictionaryEntry[],
): string {
  // Apply dictionary + sanitize to the clean text portion
  const processedClean = prepareTextForTts(cleanText, dictionary);

  // If the original text had no tag, just return processed text
  if (textWithTag === cleanText) {
    return processedClean;
  }

  // Extract the tag prefix from the original text
  const match = textWithTag.match(AUDIO_TAG_REGEX);
  if (!match) {
    return processedClean;
  }

  // Re-attach the tag prefix to the processed clean text
  return match[0] + processedClean;
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
 * Apply dictionary entries to text by replacing words with their readings.
 * Only applies entries whose word actually appears in the text.
 * e.g. "築古マンション" → "ちくふるマンション"
 */
function applyDictionary(text: string, dictionary: DictionaryEntry[]): string {
  let result = text;
  for (const entry of dictionary) {
    if (result.includes(entry.word)) {
      result = result.replaceAll(entry.word, entry.reading);
    }
  }
  return result;
}

/** Clamp a numeric value to [min, max] range */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
