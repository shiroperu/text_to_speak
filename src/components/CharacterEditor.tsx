// src/components/CharacterEditor.tsx
// Modal dialog for creating and editing characters.
// Contains all voice parameter selectors (RadioGroup) and director's notes textarea.
// Supports voice preview playback via the onPreview callback.

import { useState } from "react";
import type { Character } from "@/types";
import {
  DEFAULT_CHARACTER,
  GEMINI_VOICES,
  PITCH_OPTIONS,
  SPEED_OPTIONS,
  EMOTION_OPTIONS,
  QUALITY_OPTIONS,
  AGE_OPTIONS,
  PERSONALITY_OPTIONS,
} from "@/config";
import { generateId } from "@/utils/id";
import { RadioGroup } from "./RadioGroup";
import { IconX, IconPlay } from "./icons";

interface CharacterEditorProps {
  character: Character;
  onSave: (char: Character) => void;
  onCancel: () => void;
  onPreview: (charForm: Character) => void;
  isPreviewLoading: boolean;
}

export function CharacterEditor({
  character,
  onSave,
  onCancel,
  onPreview,
  isPreviewLoading,
}: CharacterEditorProps) {
  const [form, setForm] = useState<Character>({ ...DEFAULT_CHARACTER, ...character });

  /** Update a single field in the form */
  const update = <K extends keyof Character>(key: K, val: Character[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const handleSave = () => {
    if (form.name.trim()) {
      onSave({ ...form, id: form.id || generateId() });
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-[min(640px,92vw)] max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="m-0 text-lg text-slate-100 font-semibold">
            {character.id ? "キャラクター編集" : "新規キャラクター"}
          </h2>
          <button onClick={onCancel} className="bg-transparent border-none text-slate-500 cursor-pointer p-1">
            <IconX />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6">
          {/* Name + Voice selector */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-widest">
                キャラクター名
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="例: 理事長"
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm font-sans box-border"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-widest">
                ベースボイス
              </label>
              <select
                value={form.voiceName}
                onChange={(e) => update("voiceName", e.target.value)}
                className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm font-sans box-border"
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} — {v.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Voice parameter radio groups (2 columns) */}
          <div className="grid grid-cols-2 gap-x-6">
            <RadioGroup label="声の高さ (Pitch)" options={PITCH_OPTIONS} value={form.pitch} onChange={(v) => update("pitch", v)} />
            <RadioGroup label="話速 (Speed)" options={SPEED_OPTIONS} value={form.speed} onChange={(v) => update("speed", v)} />
            <RadioGroup label="感情量 (Emotion)" options={EMOTION_OPTIONS} value={form.emotionIntensity} onChange={(v) => update("emotionIntensity", v)} />
            <RadioGroup label="声質 (Quality)" options={QUALITY_OPTIONS} value={form.voiceQuality} onChange={(v) => update("voiceQuality", v)} />
            <RadioGroup label="年齢 (Age)" options={AGE_OPTIONS} value={form.age} onChange={(v) => update("age", v)} />
            <RadioGroup label="性格 (Personality)" options={PERSONALITY_OPTIONS} value={form.personality} onChange={(v) => update("personality", v)} />
          </div>

          {/* Director's Notes textarea */}
          <div className="mt-2 mb-4">
            <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-widest">
              詳細口調設定 (Director's Notes)
            </label>
            <textarea
              value={form.directorsNotes}
              onChange={(e) => update("directorsNotes", e.target.value)}
              placeholder={"emotional pattern:\n  default: cold and blunt\n  embarrassed: pitch rises slightly\n\narticulation:\n  clear consonants\n  short pauses before important words"}
              rows={8}
              className="w-full py-2.5 px-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-[13px] font-mono resize-y box-border leading-relaxed"
            />
          </div>

          {/* Preview section */}
          <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onPreview(form)}
                disabled={isPreviewLoading || !form.name}
                className={`flex items-center gap-1.5 px-4 py-1.5 border-none rounded-lg text-[13px] font-semibold font-sans
                  ${isPreviewLoading
                    ? "bg-slate-700 text-slate-400 cursor-wait"
                    : "btn-primary"
                  }`}
              >
                {isPreviewLoading ? (
                  <span className="inline-block animate-spin">⟳</span>
                ) : (
                  <IconPlay />
                )}
                {isPreviewLoading ? "生成中..." : "プレビュー再生"}
              </button>
              <span className="text-[11px] text-slate-500">
                サンプルテキストで音声を確認
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-transparent border border-slate-700 rounded-lg text-slate-400 text-[13px] cursor-pointer font-sans"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className={`px-6 py-2 border-none rounded-lg text-[13px] font-semibold font-sans
              ${form.name.trim()
                ? "btn-primary"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
