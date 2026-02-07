// src/components/Sidebar.tsx
// Left sidebar panel: character list with CRUD actions,
// dictionary access, and character set export/import.

import type { Character, DictionaryEntry } from "@/types";
import { CHARACTER_COLORS } from "@/config";
import { IconPlus, IconEdit, IconTrash, IconBook, IconSave, IconUpload } from "./icons";

interface SidebarProps {
  characters: Character[];
  dictionary: DictionaryEntry[];
  onAddCharacter: () => void;
  onEditCharacter: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onShowDict: () => void;
  onExport: () => void;
  onImport: () => void;
}

/** Get the color for a character by its index in the list */
function getCharColor(idx: number): string {
  return CHARACTER_COLORS[idx % CHARACTER_COLORS.length]!;
}

export function Sidebar({
  characters,
  dictionary,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onShowDict,
  onExport,
  onImport,
}: SidebarProps) {
  return (
    <aside className="w-70 min-w-70 border-r border-slate-800 flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <h2 className="m-0 text-[13px] text-slate-400 uppercase tracking-widest">
            キャラクター
          </h2>
          <button
            onClick={onAddCharacter}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-400 text-[11px] cursor-pointer font-sans"
          >
            <IconPlus className="w-3.5 h-3.5" /> 追加
          </button>
        </div>
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-auto p-2.5">
        {characters.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-600">
            <div className="text-3xl mb-2">🎭</div>
            <p className="text-xs m-0">
              キャラクターを追加して
              <br />
              音声生成を開始しましょう
            </p>
          </div>
        ) : (
          characters.map((char, idx) => (
            <div
              key={char.id}
              className="p-2.5 px-3 bg-slate-800 rounded-xl mb-1.5 border border-slate-700 cursor-pointer transition-colors hover:border-amber-500/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: getCharColor(idx) }}
                  />
                  <span className="text-sm font-medium text-slate-100">
                    {char.name}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditCharacter(char); }}
                    className="bg-transparent border-none text-slate-500 cursor-pointer p-1 hover:text-slate-300"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteCharacter(char.id); }}
                    className="bg-transparent border-none text-slate-500 cursor-pointer p-1 hover:text-red-400"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {char.voiceName} · {char.pitch} · {char.speed} · {char.voiceQuality}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sidebar footer: dictionary + export/import */}
      <div className="p-3 border-t border-slate-800 flex flex-col gap-1.5">
        <button
          onClick={onShowDict}
          className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-slate-700 rounded-lg text-slate-400 text-xs cursor-pointer w-full font-sans hover:border-slate-500"
        >
          <IconBook /> 読み辞書
          {dictionary.length > 0 && (
            <span className="bg-amber-500 text-slate-900 rounded-full px-1.5 py-px text-[10px] font-semibold">
              {dictionary.length}
            </span>
          )}
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={onExport}
            className="flex-1 py-1.5 bg-transparent border border-slate-700 rounded-lg text-slate-500 text-[11px] cursor-pointer font-sans hover:border-slate-500 flex items-center justify-center gap-1"
          >
            <IconSave /> 保存
          </button>
          <button
            onClick={onImport}
            className="flex-1 py-1.5 bg-transparent border border-slate-700 rounded-lg text-slate-500 text-[11px] cursor-pointer font-sans hover:border-slate-500 flex items-center justify-center gap-1"
          >
            <IconUpload className="w-3.5 h-3.5" /> 読込
          </button>
        </div>
      </div>
    </aside>
  );
}
