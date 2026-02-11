// src/components/GenerationControls.tsx
// Audio generation controls: settings (pause, delay), progress bar, and action buttons.
// Displays generation progress and provides play/download for completed audio.

import type { ScriptLine } from "@/types";
import type { UseAudioGenerationReturn } from "@/hooks/useAudioGeneration";
import type { UseAudioPlaybackReturn } from "@/hooks/useAudioPlayback";
import { USE_VERTEX_AI } from "@/config";
import { IconMic, IconStop, IconPlay, IconDownload } from "./icons";

interface GenerationControlsProps {
  generation: UseAudioGenerationReturn;
  playback: UseAudioPlaybackReturn;
  scriptLines: ScriptLine[];
  detectedSpeakers: string[];
  apiKey: string;
}

export function GenerationControls({
  generation,
  playback,
  scriptLines,
  detectedSpeakers,
  apiKey,
}: GenerationControlsProps) {
  const { isGenerating, genProgress, genError, pauseMs, setPauseMs, requestDelay, setRequestDelay, audioUrl, generateAudio, stopGeneration } = generation;
  const { isPlaying, playAudio, stopAudio, downloadAudio } = playback;
  const canGenerate = scriptLines.length > 0 && (USE_VERTEX_AI || !!apiKey);

  return (
    <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl">
      {/* Settings row */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-500">行間ポーズ</label>
          <input
            type="number"
            value={pauseMs}
            onChange={(e) => setPauseMs(Number(e.target.value))}
            className="w-15 py-1 px-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs text-center font-sans"
          />
          <span className="text-[11px] text-slate-600">ms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-slate-500">リクエスト間隔</label>
          <input
            type="number"
            value={requestDelay}
            onChange={(e) => setRequestDelay(Number(e.target.value))}
            step={0.5}
            className="w-[50px] py-1 px-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 text-xs text-center font-sans"
          />
          <span className="text-[11px] text-slate-600">秒</span>
        </div>
        <div className="flex-1" />
        {scriptLines.length > 0 && (
          <span className="text-[11px] text-slate-600">
            {scriptLines.length}行 · {detectedSpeakers.length}話者
          </span>
        )}
      </div>

      {/* Progress bar (visible during generation) */}
      {isGenerating && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-slate-400 animate-pulse">
              生成中: {genProgress.currentSpeaker}
            </span>
            <span className="text-[11px] text-slate-400">
              {genProgress.current} / {genProgress.total}
            </span>
          </div>
          <div className="h-1 bg-slate-800 rounded-sm">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-sm transition-[width] duration-300"
              style={{ width: `${genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {genError && (
        <div className="text-xs text-red-500 mb-2 px-2.5 py-1.5 bg-red-500/10 rounded-md">
          {genError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2.5 items-center">
        {!isGenerating ? (
          <button
            onClick={generateAudio}
            disabled={!canGenerate}
            className={`flex items-center gap-2 px-6 py-2.5 border-none rounded-xl text-sm font-bold font-sans
              ${canGenerate
                ? "btn-primary shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
          >
            <IconMic /> 音声生成
          </button>
        ) : (
          <button
            onClick={stopGeneration}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-red-500 border-none rounded-xl text-white text-sm font-semibold cursor-pointer font-sans"
          >
            <IconStop /> 中止
          </button>
        )}

        {audioUrl && (
          <>
            <button
              onClick={isPlaying ? stopAudio : playAudio}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400 text-[13px] font-medium cursor-pointer font-sans"
            >
              {isPlaying ? <><IconStop /> 停止</> : <><IconPlay /> 再生</>}
            </button>
            <button
              onClick={downloadAudio}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-[13px] font-medium cursor-pointer font-sans"
            >
              <IconDownload /> WAVダウンロード
            </button>
          </>
        )}
      </div>
    </div>
  );
}
