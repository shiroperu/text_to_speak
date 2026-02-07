// src/utils/file.ts
// File I/O helpers for import/export and script parsing.
// Uses DOM APIs (Blob, FileReader, file input) for browser-based file operations.

import type {
  Character,
  DictionaryEntry,
  ScriptLine,
  CharacterExport,
  DictionaryExport,
} from "@/types";

/**
 * Download a JSON object as a file.
 * Creates a temporary anchor element to trigger the browser download.
 */
function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker and read the selected JSON file.
 * Calls onLoad with the parsed data, or shows an alert on parse error.
 */
function uploadJson<T>(onLoad: (data: T) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as T;
        onLoad(data);
      } catch {
        alert("無効なJSONファイルです");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/** Export characters + dictionary as a single JSON file */
export function exportCharacters(
  characters: Character[],
  dictionary: DictionaryEntry[],
): void {
  const data: CharacterExport = { version: "1.0", characters, dictionary };
  downloadJson(data, "characters.json");
}

/** Import characters + dictionary from a JSON file */
export function importCharacters(
  setCharacters: (chars: Character[]) => void,
  setDictionary: (entries: DictionaryEntry[]) => void,
): void {
  uploadJson<CharacterExport>((data) => {
    if (data.characters) setCharacters(data.characters);
    if (data.dictionary) setDictionary(data.dictionary);
  });
}

/** Export dictionary as a standalone JSON file */
export function exportDictionary(dictionary: DictionaryEntry[]): void {
  const data: DictionaryExport = { version: "1.0", entries: dictionary };
  downloadJson(data, "dictionary.json");
}

/** Import dictionary entries from a JSON file */
export function importDictionary(
  setDictionary: (entries: DictionaryEntry[]) => void,
): void {
  uploadJson<DictionaryExport>((data) => {
    if (data.entries) setDictionary(data.entries);
  });
}

/**
 * Parse a script text file into structured lines.
 * Format: "話者名:セリフ" (supports full-width ： or half-width :)
 * Skips empty lines and comment lines (starting with #).
 * Returns parsed lines and a list of unique speaker names.
 */
export function parseScriptFile(text: string): {
  lines: ScriptLine[];
  speakers: string[];
} {
  const rawLines = text.split("\n").filter(
    (l) => l.trim() && !l.trim().startsWith("#"),
  );
  const parsed: ScriptLine[] = [];
  const speakerSet = new Set<string>();

  for (const line of rawLines) {
    const match = line.match(/^(.+?)[：:](.+)$/);
    if (match) {
      const speaker = match[1]!.trim();
      const lineText = match[2]!.trim();
      parsed.push({ speaker, text: lineText, index: parsed.length });
      speakerSet.add(speaker);
    }
  }

  return { lines: parsed, speakers: [...speakerSet] };
}
