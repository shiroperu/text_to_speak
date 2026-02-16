// src/components/ScriptPanel.tsx
// Script upload area, speaker-to-character mapping, audio tag reference,
// and line preview table. Handles .txt file upload and displays parsed script lines.
//
// Audio tag click inserts/toggles tag on selected script line (or copies to clipboard if none selected).
// ElevenLabs v3 migration: Audio tag reference panel with emotion/performance categories.

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import type { Character, ScriptLine, SpeakerMap, AudioTag } from "@/types";
import { CHARACTER_COLORS, AUDIO_TAGS } from "@/config";
import { AUDIO_TAG_REGEX } from "@/utils/prompt";
import { IconUpload } from "./icons";

interface ScriptPanelProps {
  scriptLines: ScriptLine[];
  detectedSpeakers: string[];
  speakerMap: SpeakerMap;
  characters: Character[];
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSpeakerMapChange: (map: SpeakerMap) => void;
  onScriptLinesChange: (lines: ScriptLine[]) => void;
}

export function ScriptPanel({
  scriptLines,
  detectedSpeakers,
  speakerMap,
  characters,
  onFileUpload,
  onSpeakerMapChange,
  onScriptLinesChange,
}: ScriptPanelProps) {
  const [showTags, setShowTags] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState<number | null>(null);

  // Reset selection when script lines change (file re-upload), but not on tag insertion (content-only change)
  useEffect(() => {
    setSelectedLineIdx(null);
  }, [scriptLines.length]);

  /** Update a single speaker's character mapping */
  const updateMapping = (speaker: string, charId: string) => {
    onSpeakerMapChange({ ...speakerMap, [speaker]: charId });
  };

  /** Get the display color for a speaker based on their assigned character */
  const getSpeakerColor = (speaker: string): string => {
    const charIdx = characters.findIndex((c) => c.id === speakerMap[speaker]);
    return charIdx >= 0 ? CHARACTER_COLORS[charIdx % CHARACTER_COLORS.length]! : "#475569";
  };

  /** Toggle line selection (click to select, click again to deselect) */
  const handleLineClick = (idx: number) => {
    setSelectedLineIdx((prev) => (prev === idx ? null : idx));
  };

  /**
   * Handle audio tag click:
   * - Always copy tag to clipboard (legacy behavior)
   * - If a script line is selected, insert/toggle/replace the tag on that line
   */
  const handleTagClick = (tag: string) => {
    // 1. Copy to clipboard (always)
    navigator.clipboard.writeText(`[${tag}] `).catch(() => {});

    // 2. Insert into selected line if any
    if (selectedLineIdx === null) return;
    const line = scriptLines[selectedLineIdx];
    if (!line) return;

    const match = line.text.match(AUDIO_TAG_REGEX);
    let newText: string;

    if (match && match[1] === tag) {
      // Same tag already present → remove (toggle off)
      newText = line.text.slice(match[0].length);
    } else if (match) {
      // Different tag present → replace
      newText = `[${tag}] ${line.text.slice(match[0].length)}`;
    } else {
      // No tag → insert at beginning
      newText = `[${tag}] ${line.text}`;
    }

    const newLines = [...scriptLines];
    newLines[selectedLineIdx] = { ...line, text: newText };
    onScriptLinesChange(newLines);
  };

  /** Remove audio tag from selected line */
  const handleRemoveTag = () => {
    if (selectedLineIdx === null) return;
    const line = scriptLines[selectedLineIdx];
    if (!line) return;

    const match = line.text.match(AUDIO_TAG_REGEX);
    if (!match) return; // No tag to remove

    const newLines = [...scriptLines];
    newLines[selectedLineIdx] = { ...line, text: line.text.slice(match[0].length) };
    onScriptLinesChange(newLines);
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

      {/* Audio tag reference (collapsible) */}
      <div className="px-6 py-2 border-b border-slate-800">
        <button
          onClick={() => setShowTags(!showTags)}
          className="text-[11px] text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer font-sans flex items-center gap-1"
        >
          <span className="text-[10px]">{showTags ? "▼" : "▶"}</span>
          音声タグ一覧（v3）
          {selectedLineIdx !== null && (
            <span className="ml-2 text-amber-500/70">— 行{selectedLineIdx + 1}に挿入</span>
          )}
        </button>
        {showTags && (
          <div className="mt-2 space-y-2">
            {/* Emotion tags */}
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">感情</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(AUDIO_TAGS) as [AudioTag, typeof AUDIO_TAGS[AudioTag]][])
                  .filter(([, info]) => info.category === "emotion")
                  .map(([tag, info]) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-left cursor-pointer hover:border-amber-500/50 transition-colors group"
                      title={selectedLineIdx !== null
                        ? `行${selectedLineIdx + 1}に [${tag}] を挿入`
                        : `クリックでコピー: [${tag}] `}
                    >
                      <span className="text-[11px] text-amber-400 font-mono">[{tag}]</span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-400">{info.label}</span>
                    </button>
                  ))}
              </div>
            </div>
            {/* Performance tags */}
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">演出</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(AUDIO_TAGS) as [AudioTag, typeof AUDIO_TAGS[AudioTag]][])
                  .filter(([, info]) => info.category === "performance")
                  .map(([tag, info]) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-left cursor-pointer hover:border-amber-500/50 transition-colors group"
                      title={selectedLineIdx !== null
                        ? `行${selectedLineIdx + 1}に [${tag}] を挿入`
                        : `クリックでコピー: [${tag}] `}
                    >
                      <span className="text-[11px] text-amber-400 font-mono">[{tag}]</span>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-400">{info.label}</span>
                    </button>
                  ))}
              </div>
            </div>
            {/* Remove tag button */}
            {selectedLineIdx !== null && (
              <div className="pt-1">
                <button
                  onClick={handleRemoveTag}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded-md text-left cursor-pointer hover:border-red-500/50 transition-colors"
                  title={`行${selectedLineIdx + 1}のタグを削除`}
                >
                  <span className="text-[11px] text-red-400 font-mono">✕</span>
                  <span className="text-[10px] text-red-400">タグ削除</span>
                </button>
              </div>
            )}
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
              const isSelected = selectedLineIdx === idx;
              // Detect audio tag at start of text for highlighted display
              const tagMatch = line.text.match(AUDIO_TAG_REGEX);

              return (
                <div
                  key={idx}
                  onClick={() => handleLineClick(idx)}
                  className={`flex gap-3 py-2 border-b cursor-pointer transition-colors ${
                    isSelected
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-slate-800/50 hover:bg-slate-800/30"
                  } animate-slide-in`}
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
                    {tagMatch ? (
                      <>
                        <span className="text-amber-400/80 font-mono text-[12px]">{tagMatch[0].trimEnd()}</span>
                        {" "}
                        {line.text.slice(tagMatch[0].length)}
                      </>
                    ) : (
                      line.text
                    )}
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
