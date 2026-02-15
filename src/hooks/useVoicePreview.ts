// src/hooks/useVoicePreview.ts
// Custom hook for character voice preview using ElevenLabs TTS API.
// Makes a single TTS API call with sample text to let the user hear the voice.
//
// ElevenLabs migration:
// - Uses xi-api-key header authentication
// - Sends voice_settings built from Character UI params
// - Receives raw PCM binary (pcm_24000), converts to WAV for playback

import { useState, useRef, useCallback, useEffect } from "react";
import type { Character, DictionaryEntry } from "@/types";
import {
  ELEVENLABS_API_BASE, ELEVENLABS_MODEL_ID, ELEVENLABS_OUTPUT_FORMAT,
  PREVIEW_TEXT,
} from "@/config";
import { buildVoiceSettings, prepareTextForTts } from "@/utils/prompt";
import { pcmToWav } from "@/utils/audio";

export interface UseVoicePreviewReturn {
  isPreviewLoading: boolean;
  previewVoice: (charForm: Character) => Promise<void>;
}

/**
 * Hook for previewing a character's voice.
 * Generates audio from sample text using ElevenLabs TTS API and plays it.
 */
export function useVoicePreview(
  apiKey: string,
  dictionary: DictionaryEntry[],
): UseVoicePreviewReturn {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio object URL on unmount to prevent memory leaks (#5 review fix)
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        URL.revokeObjectURL(previewAudioRef.current.src);
        previewAudioRef.current = null;
      }
    };
  }, []);

  const previewVoice = useCallback(async (charForm: Character) => {
    if (!apiKey) {
      alert("API Keyを設定してください");
      return;
    }
    if (!charForm.voiceId) {
      alert("ボイスを選択してください");
      return;
    }

    setIsPreviewLoading(true);
    try {
      // Build voice_settings from character UI params
      const voiceSettings = buildVoiceSettings(charForm);
      // Prepare text with dictionary readings and sanitization
      const text = prepareTextForTts(PREVIEW_TEXT, dictionary);

      // Validate voiceId before URL insertion (prevents URL injection)
      if (!/^[a-zA-Z0-9_]+$/.test(charForm.voiceId)) {
        throw new Error(`無効なvoice ID: "${charForm.voiceId}"`);
      }

      const url = `${ELEVENLABS_API_BASE}/text-to-speech/${charForm.voiceId}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: voiceSettings,
        }),
      });

      if (!res.ok) {
        // Try to extract error message from JSON response body
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errorData = await res.json() as { detail?: { message?: string }; message?: string };
          errorMsg = errorData.detail?.message ?? errorData.message ?? errorMsg;
        } catch {
          // Response may not be JSON
        }
        throw new Error(errorMsg);
      }

      // Response is raw PCM binary — convert to WAV for Audio playback
      const arrayBuffer = await res.arrayBuffer();
      const wav = pcmToWav(arrayBuffer);
      const audioUrl = URL.createObjectURL(wav);

      // Clean up previous preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        URL.revokeObjectURL(previewAudioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.play();
    } catch (err) {
      alert("プレビューエラー: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [apiKey, dictionary]);

  return { isPreviewLoading, previewVoice };
}
