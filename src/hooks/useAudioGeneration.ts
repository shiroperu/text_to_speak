// src/hooks/useAudioGeneration.ts
// Custom hook for the main audio generation pipeline.
// Handles: generation plan building (single/multi-speaker grouping),
// API calls with retry + rate limiting, PCM concatenation, and WAV output.
// This is the most complex hook — extracted from the monolithic App component.

import { useState, useRef, useCallback } from "react";
import type { Character, DictionaryEntry, ScriptLine, SpeakerMap, GenerationProgress, GenerationStep } from "@/types";
import { GEMINI_API_BASE, GEMINI_TTS_MODEL, DEFAULT_PAUSE_MS, DEFAULT_REQUEST_DELAY_SEC, MAX_RETRIES } from "@/config";
import { buildPromptForCharacter, buildMultiSpeakerPrompt } from "@/utils/prompt";
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
 * Build a generation plan that groups consecutive lines for multi-speaker optimization.
 * Two consecutive lines with different speakers are grouped as "multi" (uses 2-speaker API).
 * All other lines are "single" (one speaker per request).
 */
function buildPlan(lines: ScriptLine[], charLookup: Record<string, Character>): GenerationStep[] {
  const plan: GenerationStep[] = [];
  let i = 0;
  while (i < lines.length) {
    const current = lines[i]!;
    const next = lines[i + 1];
    // Group consecutive pairs with different speakers for multi-speaker API
    if (
      next &&
      current.speaker !== next.speaker &&
      charLookup[current.speaker] &&
      charLookup[next.speaker]
    ) {
      plan.push({ type: "multi", lines: [current, next] });
      i += 2;
    } else {
      plan.push({ type: "single", lines: [current] });
      i += 1;
    }
  }
  return plan;
}

/** Make a single-speaker TTS API call with retry logic */
async function callSingleSpeakerApi(
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: char.voiceName } },
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

/** Make a multi-speaker TTS API call with retry + fallback to single */
async function callMultiSpeakerApi(
  apiKey: string,
  lines: ScriptLine[],
  charLookup: Record<string, Character>,
  dictionary: DictionaryEntry[],
  pauseMs: number,
  requestDelay: number,
  abortRef: React.RefObject<boolean>,
): Promise<Int16Array[]> {
  const [line1, line2] = lines as [ScriptLine, ScriptLine];
  const char1 = charLookup[line1.speaker]!;
  const char2 = charLookup[line2.speaker]!;
  const prompt = buildMultiSpeakerPrompt(
    lines,
    { [line1.speaker]: char1, [line2.speaker]: char2 },
    dictionary,
  );

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      const res = await fetch(apiUrl(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  { speaker: line1.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: char1.voiceName } } },
                  { speaker: line2.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: char2.voiceName } } },
                ],
              },
            },
          },
        }),
      });
      const data = await res.json();

      if (data.error) {
        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, Math.pow(2, retry + 1) * 2000));
          continue;
        }
        throw new Error(data.error.message);
      }

      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("No audio data");
      return [new Int16Array(base64ToArrayBuffer(audioData))];
    } catch (err) {
      // On final retry failure, fall back to individual single-speaker calls
      if (retry === MAX_RETRIES - 1) {
        console.warn("Multi-speaker failed, falling back to single:", (err as Error).message);
        const chunks: Int16Array[] = [];
        for (let li = 0; li < lines.length; li++) {
          if (abortRef.current) break;
          const line = lines[li]!;
          const char = charLookup[line.speaker]!;
          const singlePrompt = buildPromptForCharacter(char, line.text, dictionary);
          const result = await callSingleSpeakerApi(apiKey, char, singlePrompt);
          if (result) chunks.push(result);
          // Insert silence between fallback lines (not after last)
          if (li < lines.length - 1) chunks.push(createSilence(pauseMs));
          await new Promise((r) => setTimeout(r, requestDelay * 1000));
        }
        return chunks;
      }
    }
  }
  return [];
}

/**
 * Main audio generation hook.
 * Orchestrates the entire generation pipeline from script lines to WAV output.
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

    const plan = buildPlan(scriptLines, charLookup);
    setGenProgress({ current: 0, total: scriptLines.length, currentSpeaker: "" });
    const allPcmChunks: Int16Array[] = [];
    let processedLines = 0;

    try {
      for (let pi = 0; pi < plan.length; pi++) {
        if (abortRef.current) break;
        const step = plan[pi]!;

        if (step.type === "multi") {
          const [line1, line2] = step.lines as [ScriptLine, ScriptLine];
          setGenProgress({ current: processedLines, total: scriptLines.length, currentSpeaker: `${line1.speaker} & ${line2.speaker} (Multi)` });

          const chunks = await callMultiSpeakerApi(apiKey, step.lines, charLookup, dictionary, pauseMs, requestDelay, abortRef);
          allPcmChunks.push(...chunks);
          processedLines += 2;
        } else {
          const line = step.lines[0]!;
          const char = charLookup[line.speaker]!;
          setGenProgress({ current: processedLines, total: scriptLines.length, currentSpeaker: line.speaker });

          const prompt = buildPromptForCharacter(char, line.text, dictionary);
          try {
            const result = await callSingleSpeakerApi(apiKey, char, prompt);
            if (result) allPcmChunks.push(result);
          } catch (err) {
            setGenError(`行${line.index + 1}でエラー: ${(err as Error).message}`);
          }
          processedLines += 1;
        }

        // Insert silence between steps (not after the last one)
        if (pi < plan.length - 1 && !abortRef.current) {
          allPcmChunks.push(createSilence(pauseMs));
        }
        // Rate limit delay between requests
        if (pi < plan.length - 1 && !abortRef.current) {
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
