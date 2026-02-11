// src/utils/prompt.ts
// Prompt construction for Gemini TTS API.
// Compact prompt design — minimizes token count to reduce finishReason:OTHER errors.
// Voice selection is handled by voiceConfig; prompt provides style hints only.
// Dictionary readings are injected inline (e.g. "築古（ちくふる）") instead of
// a separate section, keeping the prompt short.

import type { Character, DictionaryEntry } from "@/types";
import type { Pitch, Speed, EmotionIntensity, VoiceQuality, Age, Personality } from "@/types";

// --- Compact voice trait labels ---
// Short Japanese descriptions joined into a single line in the prompt.

const PITCH_LABEL: Record<Pitch, string> = {
  low: "低め",
  mid: "中音",
  high: "高め",
};

const SPEED_LABEL: Record<Speed, string> = {
  slow: "ゆっくり",
  normal: "普通",
  fast: "速め",
};

const EMOTION_LABEL: Record<EmotionIntensity, string> = {
  small: "控えめ",
  medium: "普通",
  large: "感情豊か",
};

const QUALITY_LABEL: Record<VoiceQuality, string> = {
  clear: "クリア",
  breathy: "息まじり",
  nasal: "鼻声",
  husky: "ハスキー",
};

const AGE_LABEL: Record<Age, string> = {
  child: "子供",
  teen: "10代",
  adult: "大人",
};

const PERSONALITY_LABEL: Record<Personality, string> = {
  calm: "穏やか",
  cheerful: "明るい",
  shy: "控えめ",
  aggressive: "力強い",
};

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

  // Director's notes — user controls content and length
  if (char.directorsNotes?.trim()) {
    prompt += `${char.directorsNotes}\n`;
  }

  prompt += `\n以下のセリフを読み上げてください:\n${processedText}`;
  return prompt;
}
