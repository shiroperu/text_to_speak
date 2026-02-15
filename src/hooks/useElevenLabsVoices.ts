// src/hooks/useElevenLabsVoices.ts
// Custom hook for fetching available voices from the ElevenLabs API.
// Returns the voice list, loading state, and error state.
//
// Fetches user's own voices from GET /v1/voices.
// This includes premade, cloned, and generated voices that the user has
// added to their account. Shared library voices are NOT included because
// they require a paid subscription to use via API.
//
// To get Japanese native voices, users should:
// 1. Go to https://elevenlabs.io/voice-library
// 2. Filter by language: Japanese
// 3. Click "Add to Library" on desired voices
// 4. The voices will then appear in this list
//
// Design decisions:
// - Fetch only when apiKey is non-empty (avoid unauthorized 401)
// - Cache result in state — refetch only when apiKey changes

import { useState, useEffect, useRef } from "react";
import type { ElevenLabsVoice, ElevenLabsVoiceResponse } from "@/types";
import {
  ELEVENLABS_API_BASE,
  ELEVENLABS_VOICES_ENDPOINT,
} from "@/config";

export interface UseElevenLabsVoicesReturn {
  /** List of available voices (empty while loading or on error) */
  voices: ElevenLabsVoice[];
  /** Whether the voice list is currently being fetched */
  isLoading: boolean;
  /** Error message if the fetch failed, null otherwise */
  error: string | null;
}

/**
 * Hook for fetching the available voice list from ElevenLabs.
 * Fetches only the user's own voices (GET /v1/voices).
 * Requires a valid API key (xi-api-key header authentication).
 * Returns empty array when apiKey is empty.
 */
export function useElevenLabsVoices(apiKey: string): UseElevenLabsVoicesReturn {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the last successfully-fetched apiKey to avoid redundant fetches
  const lastFetchedKeyRef = useRef<string>("");

  useEffect(() => {
    // Skip fetch if no API key or already fetched for this key
    if (!apiKey) {
      setVoices([]);
      setError(null);
      lastFetchedKeyRef.current = "";
      return;
    }

    if (apiKey === lastFetchedKeyRef.current) {
      return;
    }

    let cancelled = false;

    async function fetchVoices() {
      setIsLoading(true);
      setError(null);

      const headers = { "xi-api-key": apiKey };

      try {
        const res = await fetch(`${ELEVENLABS_API_BASE}${ELEVENLABS_VOICES_ENDPOINT}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errorData = await res.json() as { detail?: { message?: string }; message?: string };
            errorMsg = errorData.detail?.message ?? errorData.message ?? errorMsg;
          } catch {
            // ignore parse error
          }
          throw new Error(errorMsg);
        }

        const data = await res.json() as ElevenLabsVoiceResponse;

        if (!cancelled) {
          setVoices(data.voices ?? []);
          lastFetchedKeyRef.current = apiKey;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setVoices([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchVoices();

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { voices, isLoading, error };
}
