// src/components/ScriptPanel.tsx
// Script upload area, speaker-to-character mapping, and line preview table.
// Handles .txt file upload and displays parsed script lines.

import type { ChangeEvent } from "react";
import type { Character, ScriptLine, SpeakerMap } from "@/types";
import { CHARACTER_COLORS } from "@/config";
import { IconUpload } from "./icons";

interface ScriptPanelProps {
  scriptLines: ScriptLine[];
  detectedSpeakers: string[];
  speakerMap: SpeakerMap;
  characters: Character[];
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSpeakerMapChange: (map: SpeakerMap) => void;
}

export function ScriptPanel({
  scriptLines,
  detectedSpeakers,
  speakerMap,
  characters,
  onFileUpload,
  onSpeakerMapChange,
}: ScriptPanelProps) {
  /** Update a single speaker's character mapping */
  const updateMapping = (speaker: string, charId: string) => {
    onSpeakerMapChange({ ...speakerMap, [speaker]: charId });
  };

  /** Get the display color for a speaker based on their assigned character */
  const getSpeakerColor = (speaker: string): string => {
    const charIdx = characters.findIndex((c) => c.id === speakerMap[speaker]);
    return charIdx >= 0 ? CHARACTER_COLORS[charIdx % CHARACTER_COLORS.length]! : "#475569";
  };

  return (
    <>
      {/* Upload bar + speaker mapping */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-[13px] text-slate-400 uppercase tracking-widest">
            台本
          </h2>
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-xs cursor-pointer font-sans">
            <IconUpload /> TXTファイルを選択
            <input
              type="file"
              accept=".txt"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Speaker ↔ Character mapping dropdowns */}
        {detectedSpeakers.length > 0 && (
          <div className="mt-3 flex gap-3 flex-wrap">
            {detectedSpeakers.map((sp) => (
              <div
                key={sp}
                className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <span className="text-[13px] text-slate-100 font-medium">{sp}</span>
                <span className="text-slate-600">→</span>
                <select
                  value={speakerMap[sp] ?? ""}
                  onChange={(e) => updateMapping(sp, e.target.value)}
                  className={`py-1 px-2 bg-slate-900 border border-slate-700 rounded-md text-xs font-sans ${
                    speakerMap[sp] ? "text-amber-400" : "text-red-500"
                  }`}
                >
                  <option value="">未割当</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Script lines preview */}
      <div className="flex-1 overflow-auto px-6">
        {scriptLines.length === 0 ? (
          <div className="text-center py-16 px-5 text-slate-600">
            <div className="text-5xl mb-4 opacity-30">📝</div>
            <p className="text-sm mb-2">台本ファイルをアップロードしてください</p>
            <p className="text-xs text-slate-700">フォーマット: 「話者名:セリフ」（1行1発言）</p>
          </div>
        ) : (
          <div className="py-3">
            {scriptLines.map((line, idx) => {
              const color = getSpeakerColor(line.speaker);
              return (
                <div
                  key={idx}
                  className="flex gap-3 py-2 border-b border-slate-800/50 animate-slide-in"
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  <div className="w-7 text-right text-[11px] text-slate-700 pt-0.5 shrink-0">
                    {idx + 1}
                  </div>
                  <div
                    className="text-xs font-semibold min-w-[90px] pt-0.5 flex items-start gap-1"
                    style={{ color }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: color }}
                    />
                    {line.speaker}
                  </div>
                  <div className="text-[13px] text-slate-300 leading-relaxed flex-1">
                    {line.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
