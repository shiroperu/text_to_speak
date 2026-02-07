// src/hooks/useAudioGeneration.ts
// Custom hook for the main audio generation pipeline.
// Always uses single-speaker API for voice consistency —
// each character goes through the identical code path every time,
// ensuring the same voice across all lines and scripts.

import { useState, useRef, useCallback } from "react";
import type { Character, DictionaryEntry, ScriptLine, SpeakerMap, GenerationProgress } from "@/types";
import { GEMINI_API_BASE, GEMINI_TTS_MODEL, DEFAULT_PAUSE_MS, DEFAULT_REQUEST_DELAY_SEC, MAX_RETRIES } from "@/config";
import { buildPromptForCharacter } from "@/utils/prompt";
import { base64ToArrayBuffer, createSilence, pcmToWav } from "@/utils/audio";

export interface UseAudioGenerationReturn {
  isGenerating: boolean;
  genProgress: GenerationProgress;
  genError: string | null;
  pauseMs: number;
  setPauseMs: (ms: number) => void;
  requestDelay: number;
  setRequestDelay: (delay: number) => void;
  audioBlob: Blob | null;
  audioUrl: string | null;
  generateAudio: () => Promise<void>;
  stopGeneration: () => void;
}

/** Build the TTS API URL with the given API key */
function apiUrl(apiKey: string): string {
  return `${GEMINI_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Make a single-speaker TTS API call with retry logic.
 * Always uses the same voiceConfig for a given character,
 * so the voice stays consistent across all lines.
 */
async function callTtsApi(
  apiKey: string,
  char: Character,
  prompt: string,
): Promise<Int16Array | null> {
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    const res = await fetch(apiUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: char.voiceName },
            },
          },
        },
      }),
    });
    const data = await res.json();

    if (data.error) {
      // Rate limit: exponential backoff
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, Math.pow(2, retry + 1) * 2000));
        continue;
      }
      if (retry === MAX_RETRIES - 1) throw new Error(data.error.message);
      continue;
    }

    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data");
    return new Int16Array(base64ToArrayBuffer(audioData));
  }
  return null;
}

/**
 * Main audio generation hook.
 * Processes each script line individually with single-speaker TTS,
 * ensuring consistent voice per character regardless of line position or script.
 */
export function useAudioGeneration(
  apiKey: string,
  characters: Character[],
  dictionary: DictionaryEntry[],
  scriptLines: ScriptLine[],
  speakerMap: SpeakerMap,
  detectedSpeakers: string[],
): UseAudioGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<GenerationProgress>({ current: 0, total: 0, currentSpeaker: "" });
  const [genError, setGenError] = useState<string | null>(null);
  const [pauseMs, setPauseMs] = useState(DEFAULT_PAUSE_MS);
  const [requestDelay, setRequestDelay] = useState(DEFAULT_REQUEST_DELAY_SEC);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
  }, []);

  const generateAudio = useCallback(async () => {
    if (!apiKey) { alert("API Keyを設定してください"); return; }

    // Validate all speakers are mapped to characters
    const unmapped = detectedSpeakers.filter((sp) => !speakerMap[sp]);
    if (unmapped.length > 0) {
      alert(`以下の話者にキャラクターが割り当てられていません:\n${unmapped.join(", ")}`);
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    abortRef.current = false;

    // Build speaker -> character lookup
    const charLookup: Record<string, Character> = {};
    for (const sp of detectedSpeakers) {
      const char = characters.find((c) => c.id === speakerMap[sp]);
      if (char) charLookup[sp] = char;
    }

    setGenProgress({ current: 0, total: scriptLines.length, currentSpeaker: "" });
    const allPcmChunks: Int16Array[] = [];

    try {
      // Process each line individually (single-speaker) for voice consistency
      for (let i = 0; i < scriptLines.length; i++) {
        if (abortRef.current) break;

        const line = scriptLines[i]!;
        const char = charLookup[line.speaker]!;
        setGenProgress({ current: i, total: scriptLines.length, currentSpeaker: line.speaker });

        const prompt = buildPromptForCharacter(char, line.text, dictionary);
        try {
          const result = await callTtsApi(apiKey, char, prompt);
          if (result) allPcmChunks.push(result);
        } catch (err) {
          setGenError(`行${line.index + 1}でエラー: ${(err as Error).message}`);
        }

        // Insert silence between lines (not after the last one)
        if (i < scriptLines.length - 1 && !abortRef.current) {
          allPcmChunks.push(createSilence(pauseMs));
        }
        // Rate limit delay between requests
        if (i < scriptLines.length - 1 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, requestDelay * 1000));
        }
      }

      // Combine all PCM chunks into a single WAV
      if (!abortRef.current && allPcmChunks.length > 0) {
        const totalLength = allPcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of allPcmChunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        const wav = pcmToWav(combined.buffer);
        // Clean up previous URL
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(wav);
        setAudioBlob(wav);
        setAudioUrl(url);
        setGenProgress({ current: scriptLines.length, total: scriptLines.length, currentSpeaker: "完了" });
      }
    } catch (err) {
      setGenError("生成エラー: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, characters, dictionary, scriptLines, speakerMap, detectedSpeakers, pauseMs, requestDelay, audioUrl]);

  return {
    isGenerating, genProgress, genError,
    pauseMs, setPauseMs, requestDelay, setRequestDelay,
    audioBlob, audioUrl,
    generateAudio, stopGeneration,
  };
}
