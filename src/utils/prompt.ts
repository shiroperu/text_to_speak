// src/utils/prompt.ts
// Prompt construction for Gemini TTS API.
// Compact prompt design — minimizes token count to reduce finishReason:OTHER errors.
// Voice selection is handled by voiceConfig; prompt provides style hints only.
// Dictionary readings are injected inline (e.g. "築古（ちくふる）") instead of
// a separate section, keeping the prompt short.

import type { Character, DictionaryEntry } from "@/types";
// import type { Pitch, Speed, EmotionIntensity, VoiceQuality, Age, Personality } from "@/types";

// --- Compact voice trait labels ---
// Short Japanese descriptions joined into a single line in the prompt.
// Currently disabled for testing — uncomment when re-enabling traits in the prompt.

// const PITCH_LABEL: Record<Pitch, string> = {
//   low: "低め",
//   mid: "中音",
//   high: "高め",
// };

// const SPEED_LABEL: Record<Speed, string> = {
//   slow: "ゆっくり",
//   normal: "普通",
//   fast: "速め",
// };

// const EMOTION_LABEL: Record<EmotionIntensity, string> = {
//   small: "控えめ",
//   medium: "普通",
//   large: "感情豊か",
// };

// const QUALITY_LABEL: Record<VoiceQuality, string> = {
//   clear: "クリア",
//   breathy: "息まじり",
//   nasal: "鼻声",
//   husky: "ハスキー",
// };

// const AGE_LABEL: Record<Age, string> = {
//   child: "子供",
//   teen: "10代",
//   adult: "大人",
// };

// const PERSONALITY_LABEL: Record<Personality, string> = {
//   calm: "穏やか",
//   cheerful: "明るい",
//   shy: "控えめ",
//   aggressive: "力強い",
// };

/**
 * Sanitize text for TTS: remove Unicode escape sequences (\uXXXX) and
 * special symbols that can confuse the Gemini TTS model.
 * - \uXXXX patterns (literal backslash-u + hex digits) → removed
 * - Control characters (U+0000–U+001F except \n) → removed
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
 * e.g. "築古マンション" -> "築古（ちくふる）マンション"
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

/**
 * Build a compact single-speaker prompt for one script line.
 * Structure: voice traits (1 line) + optional director's notes + spoken text.
 * Kept minimal to stay well within TTS model token limits.
 */
export function buildPromptForCharacter(
  char: Character,
  lineText: string,
  dictionary: DictionaryEntry[],
): string {
  // Apply dictionary readings inline — no separate pronunciation section needed
  const processedText = dictionary.length > 0
    ? applyDictionary(lineText, dictionary)
    : lineText;

  const commonTolkRules = "/\n決して単調にならずナレーター調を避ける。特定の人物に語りかけるように話す"

  // All voice traits on one compact line with parameter names
  const traits = [
    `声の高さ:${PITCH_LABEL[char.pitch]}`,
    `話速:${SPEED_LABEL[char.speed]}`,
    `感情:${EMOTION_LABEL[char.emotionIntensity]}`,
    `声質:${QUALITY_LABEL[char.voiceQuality]}`,
    `年齢:${AGE_LABEL[char.age]}`,
    `性格:${PERSONALITY_LABEL[char.personality]}`,
  ].join("/");

  let prompt = `[${char.name}] ${traits}${commonTolkRules}\n`;
  // let prompt = `[${char.name}]`;

  // Director's notes — user controls content and length
  if (char.directorsNotes?.trim()) {
    prompt += `${char.directorsNotes}\n`;
  }

  prompt += `\n以下のセリフを読み上げてください:\n${processedText}`;
  return sanitizeForTts(prompt);
}
