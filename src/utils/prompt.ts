// src/utils/prompt.ts
// Prompt construction for Gemini TTS API.
// Converts character parameters + dictionary into a structured prompt text.
// Single-speaker mode only — ensures consistent voice per character.

import type { Character, DictionaryEntry } from "@/types";
import type { Pitch, Speed, EmotionIntensity, VoiceQuality, Age, Personality } from "@/types";

// --- Parameter-to-description maps ---
// UIの列挙値を日本語の自然言語記述に変換する。

const PITCH_MAP: Record<Pitch, string> = {
  low: "低い声、落ち着いたトーン",
  mid: "中程度の高さ",
  high: "高い声",
};

const SPEED_MAP: Record<Speed, string> = {
  slow: "ゆっくり、丁寧なペース",
  normal: "自然な会話ペース",
  fast: "テンポが速く、エネルギッシュ",
};

const EMOTION_MAP: Record<EmotionIntensity, string> = {
  small: "感情を抑えた、控えめな表現",
  medium: "適度な感情表現",
  large: "感情豊かで、ドラマチックな表現",
};

const QUALITY_MAP: Record<VoiceQuality, string> = {
  clear: "クリアで明瞭な発声",
  breathy: "息まじりの柔らかい声質",
  nasal: "やや鼻にかかった声",
  husky: "ハスキーで低めの声質",
};

const AGE_MAP: Record<Age, string> = {
  child: "子供のような声",
  teen: "10代の若い声",
  adult: "大人の声",
};

const PERSONALITY_MAP: Record<Personality, string> = {
  calm: "穏やかで落ち着いた話し方",
  cheerful: "明るく元気な話し方",
  shy: "控えめで遠慮がちな話し方",
  aggressive: "力強く断定的な話し方",
};

/**
 * Apply dictionary entries to text by injecting readings in parentheses.
 * e.g. "築古マンション" -> "築古（ちくふる）マンション"
 */
function applyDictionary(text: string, dictionary: DictionaryEntry[]): string {
  let result = text;
  for (const entry of dictionary) {
    result = result.replaceAll(entry.word, `${entry.word}（${entry.reading}）`);
  }
  return result;
}

/**
 * Build a single-speaker prompt for one script line.
 * Includes: audio profile, voice characteristics, director's notes,
 * pronunciation guide, and the line to speak.
 */
export function buildPromptForCharacter(
  char: Character,
  lineText: string,
  dictionary: DictionaryEntry[],
): string {
  // Apply dictionary substitutions to the spoken text
  const processedText = dictionary.length > 0
    ? applyDictionary(lineText, dictionary)
    : lineText;

  let prompt = `## 音声プロファイル: ${char.name}\n\n`;
  prompt += `### 声の特徴\n`;
  prompt += `- 声の高さ: ${PITCH_MAP[char.pitch]}\n`;
  prompt += `- 話速: ${SPEED_MAP[char.speed]}\n`;
  prompt += `- 感情量: ${EMOTION_MAP[char.emotionIntensity]}\n`;
  prompt += `- 声質: ${QUALITY_MAP[char.voiceQuality]}\n`;
  prompt += `- 年齢感: ${AGE_MAP[char.age]}\n`;
  prompt += `- 性格: ${PERSONALITY_MAP[char.personality]}\n`;

  // Director's notes (free-form user input)
  if (char.directorsNotes?.trim()) {
    prompt += `\n### 演出指示\n${char.directorsNotes}\n`;
  }

  // Pronunciation guide — always include ALL entries to keep prompt structure
  // identical across lines (reduces voice variation from prompt differences)
  if (dictionary.length > 0) {
    prompt += `\n### 読み方ガイド\n`;
    for (const entry of dictionary) {
      prompt += `- 「${entry.word}」は「${entry.reading}」と読むこと\n`;
    }
  }

  prompt += `\n### 一貫性ルール\n`;
  prompt += `- このキャラクターの声、トーン、話し方を常に同一に保つこと。\n`;
  prompt += `- セリフの内容に関わらず、声の高さ・声質・アクセントを変えないこと。\n`;
  prompt += `- 同一人物が話しているように聞こえること。\n`;

  prompt += `\n以下のセリフをこのキャラクターとして自然に読み上げてください:\n「${processedText}」`;
  return prompt;
}
