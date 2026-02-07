// src/hooks/useAudioPlayback.ts
// Custom hook for audio playback and download.
// Manages the Audio element lifecycle (play, stop, cleanup).

import { useState, useRef, useCallback } from "react";

export interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playAudio: () => void;
  stopAudio: () => void;
  downloadAudio: () => void;
}

/**
 * Hook for playing and downloading generated audio.
 * Takes the audio URL and Blob from the generation hook.
 */
export function useAudioPlayback(
  audioUrl: string | null,
  audioBlob: Blob | null,
): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(() => {
    if (!audioUrl) return;
    // Stop any currently playing audio first
    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }, [audioUrl]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const downloadAudio = useCallback(() => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_audio.wav";
    a.click();
    URL.revokeObjectURL(url);
  }, [audioBlob]);

  return { isPlaying, playAudio, stopAudio, downloadAudio };
}
