// src/hooks/useVoicePreview.ts
// Custom hook for character voice preview.
// Makes a single TTS API call with sample text to let the user hear the voice.

import { useState, useRef, useCallback } from "react";
import type { Character, DictionaryEntry } from "@/types";
import { GEMINI_API_BASE, GEMINI_TTS_MODEL, PREVIEW_TEXT } from "@/config";
import { buildPromptForCharacter } from "@/utils/prompt";
import { base64ToArrayBuffer, pcmToWav } from "@/utils/audio";

export interface UseVoicePreviewReturn {
  isPreviewLoading: boolean;
  previewVoice: (charForm: Character) => Promise<void>;
}

/**
 * Hook for previewing a character's voice.
 * Generates audio from sample text and plays it immediately.
 */
export function useVoicePreview(
  apiKey: string,
  dictionary: DictionaryEntry[],
): UseVoicePreviewReturn {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const previewVoice = useCallback(async (charForm: Character) => {
    if (!apiKey) {
      alert("API Keyを設定してください");
      return;
    }
    setIsPreviewLoading(true);
    try {
      const prompt = buildPromptForCharacter(charForm, PREVIEW_TEXT, dictionary);
      const res = await fetch(
        `${GEMINI_API_BASE}/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              temperature: 0,
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: charForm.voiceName },
                },
              },
            },
          }),
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("音声データが取得できませんでした");

      const pcm = base64ToArrayBuffer(audioData);
      const wav = pcmToWav(pcm);
      const url = URL.createObjectURL(wav);

      // Clean up previous preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        URL.revokeObjectURL(previewAudioRef.current.src);
      }

      const audio = new Audio(url);
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
