// src/utils/audio.ts
// Audio utility functions for PCM/WAV manipulation.
// Handles PCM-to-WAV conversion and silence generation.
// All functions are pure and operate on ArrayBuffer/TypedArray data.
//
// ElevenLabs migration:
// - Removed base64ToArrayBuffer() — ElevenLabs returns raw binary PCM,
//   no Base64 decoding needed.
// - pcmToWav() and createSilence() retained — pcm_24000 output format
//   uses the same PCM 16bit 24kHz mono format as before.

import { SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE } from "@/config";

/**
 * Convert raw PCM data to a WAV Blob.
 * Prepends a 44-byte RIFF/WAV header to the PCM payload.
 * Expects PCM 16-bit signed little-endian mono at SAMPLE_RATE (24000 Hz).
 */
export function pcmToWav(pcmData: ArrayBuffer): Blob {
  const dataLength = pcmData.byteLength;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // Helper: write ASCII string at offset
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");

  // fmt sub-chunk
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(32, CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Create a silent PCM buffer of the given duration.
 * Returns Int16Array filled with zeros (silence).
 * Used to insert pauses between generated speech lines.
 */
export function createSilence(durationMs: number): Int16Array {
  const samples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  return new Int16Array(samples);
}
