// src/utils/prompt.ts
// Prompt construction for Gemini TTS API.
// Converts character parameters + dictionary into structured prompt text.
// Two modes: single-speaker (per-line) and multi-speaker (paired lines).

import type { Character, DictionaryEntry, ScriptLine } from "@/types";
import type { Pitch, Speed, EmotionIntensity, VoiceQuality, Age, Personality } from "@/types";

// --- Parameter-to-description maps ---
// These maps convert UI enum values to natural language descriptions for the TTS prompt.

const PITCH_MAP: Record<Pitch, string> = {
  low: "low-pitched, deep voice",
  mid: "mid-range pitch",
  high: "high-pitched voice",
};

const SPEED_MAP: Record<Speed, string> = {
  slow: "slow, deliberate pace",
  normal: "natural conversational pace",
  fast: "quick, energetic pace",
};

const EMOTION_MAP: Record<EmotionIntensity, string> = {
  small: "restrained emotion, subtle expressiveness",
  medium: "moderate expressiveness",
  large: "highly expressive, dramatic emotion",
};

const QUALITY_MAP: Record<VoiceQuality, string> = {
  clear: "clear, crisp articulation",
  breathy: "breathy, airy voice quality",
  nasal: "slightly nasal resonance",
  husky: "husky, raspy voice quality",
};

const AGE_MAP: Record<Age, string> = {
  child: "child-like voice",
  teen: "teenage voice quality",
  adult: "adult voice",
};

const PERSONALITY_MAP: Record<Personality, string> = {
  calm: "calm, composed demeanor",
  cheerful: "cheerful, bright personality",
  shy: "shy, hesitant delivery",
  aggressive: "assertive, forceful delivery",
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

  let prompt = `## AUDIO PROFILE: ${char.name}\n\n`;
  prompt += `### VOICE CHARACTERISTICS\n`;
  prompt += `- Pitch: ${PITCH_MAP[char.pitch]}\n`;
  prompt += `- Speed: ${SPEED_MAP[char.speed]}\n`;
  prompt += `- Emotion intensity: ${EMOTION_MAP[char.emotionIntensity]}\n`;
  prompt += `- Voice quality: ${QUALITY_MAP[char.voiceQuality]}\n`;
  prompt += `- Age impression: ${AGE_MAP[char.age]}\n`;
  prompt += `- Personality: ${PERSONALITY_MAP[char.personality]}\n`;

  // Director's notes (free-form user input)
  if (char.directorsNotes?.trim()) {
    prompt += `\n### DIRECTOR'S NOTES\n${char.directorsNotes}\n`;
  }

  // Pronunciation guide — only include entries relevant to this line
  if (dictionary.length > 0) {
    const relevant = dictionary.filter((entry) => lineText.includes(entry.word));
    if (relevant.length > 0) {
      prompt += `\n### PRONUNCIATION GUIDE\n`;
      for (const entry of relevant) {
        prompt += `- ${entry.word} should be read as "${entry.reading}"\n`;
      }
    }
  }

  prompt += `\nRead the following line naturally, in character:\n「${processedText}」`;
  return prompt;
}

/**
 * Build a multi-speaker prompt for 2 consecutive script lines.
 * Used when Gemini's multi-speaker API (max 2 speakers) can be leveraged.
 */
export function buildMultiSpeakerPrompt(
  lines: ScriptLine[],
  characters: Record<string, Character>,
  dictionary: DictionaryEntry[],
): string {
  let prompt = "";

  // Add voice profiles for each unique speaker
  const addedSpeakers = new Set<string>();
  for (const line of lines) {
    const char = characters[line.speaker];
    if (char && !addedSpeakers.has(line.speaker)) {
      addedSpeakers.add(line.speaker);
      prompt += `## ${line.speaker}'s voice: ${PITCH_MAP[char.pitch]}, ${SPEED_MAP[char.speed]}, ${QUALITY_MAP[char.voiceQuality]}\n`;
      if (char.directorsNotes) {
        prompt += `Director's notes for ${line.speaker}: ${char.directorsNotes}\n`;
      }
    }
  }

  // Pronunciation guide
  if (dictionary.length > 0) {
    prompt += `\n## PRONUNCIATION GUIDE\n`;
    for (const entry of dictionary) {
      prompt += `- ${entry.word} = "${entry.reading}"\n`;
    }
  }

  // Build conversation text
  const speakerNames = [...new Set(lines.map((l) => l.speaker))];
  prompt += `\nTTS the following conversation between ${speakerNames.join(" and ")}:\n`;
  for (const line of lines) {
    const text = dictionary.length > 0
      ? applyDictionary(line.text, dictionary)
      : line.text;
    prompt += `${line.speaker}: ${text}\n`;
  }

  return prompt;
}
