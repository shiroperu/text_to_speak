// src/components/DictionaryManager.tsx
// Modal dialog for managing pronunciation dictionary entries.
// Supports add, delete, export (JSON), and import (JSON).
// Dictionary entries map words to their correct readings (e.g. 築古 → ちくふる).

import { useState } from "react";
import type { DictionaryEntry } from "@/types";
import { exportDictionary, importDictionary } from "@/utils/file";
import { IconBook, IconX, IconTrash } from "./icons";

interface DictionaryManagerProps {
  dictionary: DictionaryEntry[];
  setDictionary: React.Dispatch<React.SetStateAction<DictionaryEntry[]>>;
  onClose: () => void;
}

export function DictionaryManager({
  dictionary,
  setDictionary,
  onClose,
}: DictionaryManagerProps) {
  const [newWord, setNewWord] = useState("");
  const [newReading, setNewReading] = useState("");

  /** Add a new dictionary entry */
  const addEntry = () => {
    if (newWord.trim() && newReading.trim()) {
      setDictionary((d) => [...d, { word: newWord.trim(), reading: newReading.trim() }]);
      setNewWord("");
      setNewReading("");
    }
  };

  /** Remove an entry by index */
  const removeEntry = (idx: number) => {
    setDictionary((d) => d.filter((_, i) => i !== idx));
  };

  /** Handle import — wraps the file utility to work with setState */
  const handleImport = () => {
    importDictionary((entries) => setDictionary(entries));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-[min(500px,90vw)] max-h-[80vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="m-0 text-lg text-slate-100 flex items-center gap-2">
            <IconBook /> 読み辞書
          </h2>
          <button onClick={onClose} className="bg-transparent border-none text-slate-500 cursor-pointer p-1">
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Entry list */}
          {dictionary.length > 0 ? (
            <div className="mb-4">
              {dictionary.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 py-2 bg-slate-900 rounded-lg mb-1.5"
                >
                  <span className="text-slate-100 text-sm flex-1">{entry.word}</span>
                  <span className="text-slate-500 text-[13px]">→</span>
                  <span className="text-amber-400 text-sm flex-1">{entry.reading}</span>
                  <button
                    onClick={() => removeEntry(i)}
                    className="bg-transparent border-none text-red-500 cursor-pointer p-1"
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[13px] text-center py-5">
              辞書エントリがありません
            </p>
          )}

          {/* Add new entry */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">単語</label>
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="築古"
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
                className="w-full py-1.5 px-2.5 bg-slate-900 border border-slate-700 rounded-md text-slate-100 text-[13px] font-sans box-border"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">読み</label>
              <input
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                placeholder="ちくふる"
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
                className="w-full py-1.5 px-2.5 bg-slate-900 border border-slate-700 rounded-md text-slate-100 text-[13px] font-sans box-border"
              />
            </div>
            <button
              onClick={addEntry}
              disabled={!newWord.trim() || !newReading.trim()}
              className={`px-3.5 py-1.5 border-none rounded-md text-[13px] font-semibold whitespace-nowrap font-sans
                ${newWord.trim() && newReading.trim()
                  ? "bg-amber-500 text-slate-900 cursor-pointer"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
            >
              追加
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-2.5">
          <button
            onClick={() => exportDictionary(dictionary)}
            className="px-3.5 py-1.5 bg-transparent border border-slate-700 rounded-md text-slate-400 text-xs cursor-pointer font-sans"
          >
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="px-3.5 py-1.5 bg-transparent border border-slate-700 rounded-md text-slate-400 text-xs cursor-pointer font-sans"
          >
            インポート
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4.5 py-1.5 btn-primary rounded-md text-[13px]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
