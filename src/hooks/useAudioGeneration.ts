// src/hooks/useAudioGeneration.ts
// Custom hook for the main audio generation pipeline using ElevenLabs TTS API (v3).
//
// Processes each script line individually with single-speaker TTS.
// Uses voice_settings built from Character UI params (v3 audio tags handled by model).
// Response is raw PCM (pcm_24000) — combined into WAV for playback/download.

import { useState, useRef, useCallback } from "react";
import type { Character, DictionaryEntry, ScriptLine, SpeakerMap, GenerationProgress, VoiceSettings } from "@/types";
import {
  ELEVENLABS_API_BASE, ELEVENLABS_MODEL_ID, ELEVENLABS_OUTPUT_FORMAT,
  ELEVENLABS_MAX_CHARS, DEFAULT_PAUSE_MS, DEFAULT_REQUEST_DELAY_SEC, MAX_RETRIES,
} from "@/config";
import { buildVoiceSettings, extractAudioTag, prepareTextWithAudioTag } from "@/utils/prompt";
import { createSilence, pcmToWav } from "@/utils/audio";

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

/** Default wait time (seconds) when 429 has no Retry-After header */
const RATE_LIMIT_DEFAULT_WAIT_SEC = 30;

/** Maximum 429 retries before giving up (prevents infinite loop) */
const MAX_RATE_LIMIT_RETRIES = 5;

/** Validate voiceId format — alphanumeric + underscores only (prevents URL injection) */
function isValidVoiceId(id: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(id);
}

/**
 * Make a single ElevenLabs TTS API call with retry logic.
 * Returns raw PCM Int16Array, or null on unrecoverable failure.
 *
 * @param apiKey - ElevenLabs API key (sent via xi-api-key header)
 * @param voiceId - ElevenLabs voice ID (used in URL path, validated for safe characters)
 * @param text - Text to synthesize (may contain v3 audio tags like [angry])
 * @param voiceSettings - Computed voice_settings from character UI params
 */
async function callTtsApi(
  apiKey: string,
  voiceId: string,
  text: string,
  voiceSettings: VoiceSettings,
): Promise<Int16Array | null> {
  // Validate voiceId before inserting into URL path
  if (!isValidVoiceId(voiceId)) {
    throw new Error(`無効なvoice ID: "${voiceId}"`);
  }

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;

  // Build request body (v3 does not support previous_text / next_text)
  const body: Record<string, unknown> = {
    text,
    model_id: ELEVENLABS_MODEL_ID,
    voice_settings: voiceSettings,
  };

  let errorRetries = 0;
  let rateLimitRetries = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    // --- 429 Rate Limit: wait and retry with retry count limit ---
    if (res.status === 429) {
      rateLimitRetries++;
      if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
        throw new Error("レートリミット超過: リトライ回数上限に達しました");
      }
      const retryAfter = res.headers.get("retry-after");
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : RATE_LIMIT_DEFAULT_WAIT_SEC;
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    // --- Success: response body is raw PCM binary ---
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return new Int16Array(arrayBuffer);
    }

    // --- Error: parse JSON error body if possible ---
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errorData = await res.json() as { detail?: { message?: string }; message?: string };
      errorMessage = errorData.detail?.message ?? errorData.message ?? errorMessage;
    } catch {
      // Response may not be JSON — use status code
    }

    // 401 Unauthorized — API key issue, not retryable
    if (res.status === 401) {
      throw new Error(`認証エラー: APIキーが無効です (${errorMessage})`);
    }

    // Other errors — retry with exponential backoff
    errorRetries++;
    if (errorRetries >= MAX_RETRIES) {
      throw new Error(`API エラー: ${errorMessage}`);
    }
    await new Promise((r) => setTimeout(r, Math.pow(2, errorRetries) * 2000));
  }
}

/**
 * Main audio generation hook.
 * Processes script lines in original order.
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
  // Track previous audioUrl in ref to avoid dependency in useCallback (#6 review fix)
  const audioUrlRef = useRef<string | null>(null);

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

    // Build speaker → character lookup
    const charLookup: Record<string, Character> = {};
    for (const sp of detectedSpeakers) {
      const char = characters.find((c) => c.id === speakerMap[sp]);
      if (char) charLookup[sp] = char;
    }

    setGenProgress({ current: 0, total: scriptLines.length, currentSpeaker: "" });
    const pcmChunks: (Int16Array | null)[] = [];

    try {
      // Process lines in script order
      for (let i = 0; i < scriptLines.length; i++) {
        if (abortRef.current) break;

        const line = scriptLines[i]!;
        const char = charLookup[line.speaker]!;

        setGenProgress({ current: i + 1, total: scriptLines.length, currentSpeaker: line.speaker });

        // Extract audio tag from line text (v3: tag stays in TTS text)
        const { cleanText, textWithTag } = extractAudioTag(line.text);

        // Build voice_settings from character params (v3 handles tags via model)
        const voiceSettings = buildVoiceSettings(char);

        // Prepare TTS text with audio tag preserved (dictionary + sanitization)
        const ttsText = prepareTextWithAudioTag(textWithTag, cleanText, dictionary);

        // Warn if text exceeds v3 character limit (continue generation, don't abort)
        if (ttsText.length > ELEVENLABS_MAX_CHARS) {
          const msg = `行${line.index + 1}: テキスト長 ${ttsText.length} 文字が上限 ${ELEVENLABS_MAX_CHARS} 文字を超過`;
          console.warn(msg);
          setGenError((prev) => prev ? `${prev}\n${msg}` : msg);
        }

        try {
          const pcm = await callTtsApi(apiKey, char.voiceId, ttsText, voiceSettings);
          pcmChunks.push(pcm);
        } catch (err) {
          setGenError(`行${line.index + 1}でエラー: ${(err as Error).message}`);
          pcmChunks.push(null);
        }

        // Rate limit delay (skip after last line)
        if (i < scriptLines.length - 1 && !abortRef.current) {
          await new Promise((r) => setTimeout(r, requestDelay * 1000));
        }
      }

      // Combine all PCM chunks with silence gaps
      if (!abortRef.current) {
        const validChunks = pcmChunks.filter((c): c is Int16Array => c !== null);
        if (validChunks.length > 0) {
          const allParts: Int16Array[] = [];
          for (let i = 0; i < validChunks.length; i++) {
            allParts.push(validChunks[i]!);
            if (i < validChunks.length - 1) {
              allParts.push(createSilence(pauseMs));
            }
          }

          const totalLen = allParts.reduce((sum, c) => sum + c.length, 0);
          const combined = new Int16Array(totalLen);
          let offset = 0;
          for (const part of allParts) {
            combined.set(part, offset);
            offset += part.length;
          }

          const wav = pcmToWav(combined.buffer);
          // Revoke previous URL via ref (avoids audioUrl in dependency array)
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          const newUrl = URL.createObjectURL(wav);
          audioUrlRef.current = newUrl;
          setAudioBlob(wav);
          setAudioUrl(newUrl);
          setGenProgress({ current: scriptLines.length, total: scriptLines.length, currentSpeaker: "完了" });
        }
      }
    } catch (err) {
      setGenError("生成エラー: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, characters, dictionary, scriptLines, speakerMap, detectedSpeakers, pauseMs, requestDelay]);

  return {
    isGenerating, genProgress, genError,
    pauseMs, setPauseMs, requestDelay, setRequestDelay,
    audioBlob, audioUrl,
    generateAudio, stopGeneration,
  };
}
