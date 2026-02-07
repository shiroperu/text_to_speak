// src/App.tsx
// Root component for VoiceCast Studio.
// Manages top-level application state and composes the layout
// from Header, Sidebar, ScriptPanel, and GenerationControls.
// Heavy logic is delegated to custom hooks (generation, playback, preview).

import { useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { Character, DictionaryEntry, ScriptLine, SpeakerMap } from "@/types";
import { DEFAULT_CHARACTER } from "@/config";
import { parseScriptFile, exportCharacters, importCharacters } from "@/utils/file";
import { useAudioGeneration } from "@/hooks/useAudioGeneration";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useVoicePreview } from "@/hooks/useVoicePreview";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ScriptPanel } from "@/components/ScriptPanel";
import { GenerationControls } from "@/components/GenerationControls";
import { CharacterEditor } from "@/components/CharacterEditor";
import { DictionaryManager } from "@/components/DictionaryManager";

export default function App() {
  // --- Core state ---
  const [apiKey, setApiKey] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [showDict, setShowDict] = useState(false);
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>([]);
  const [speakerMap, setSpeakerMap] = useState<SpeakerMap>({});
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);

  // --- Custom hooks ---
  const generation = useAudioGeneration(apiKey, characters, dictionary, scriptLines, speakerMap, detectedSpeakers);
  const playback = useAudioPlayback(generation.audioUrl, generation.audioBlob);
  const preview = useVoicePreview(apiKey, dictionary);

  // --- Character CRUD ---
  const saveCharacter = (char: Character) => {
    setCharacters((prev) => {
      const idx = prev.findIndex((c) => c.id === char.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = char;
        return next;
      }
      return [...prev, char];
    });
    setEditingChar(null);
  };

  const deleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Script file upload ---
  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { lines, speakers } = parseScriptFile(text);
        setScriptLines(lines);
        setDetectedSpeakers(speakers);
        // Auto-map speakers to existing characters by matching name
        const autoMap: SpeakerMap = {};
        for (const sp of speakers) {
          const found = characters.find((c) => c.name === sp);
          if (found) autoMap[sp] = found.id;
        }
        setSpeakerMap(autoMap);
      };
      reader.readAsText(file);
    },
    [characters],
  );

  // --- Export/Import ---
  const handleExport = () => exportCharacters(characters, dictionary);
  const handleImport = () => {
    importCharacters(
      (chars) => setCharacters(chars),
      (entries) => setDictionary(entries),
    );
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-200 font-sans">
      <Header apiKey={apiKey} onApiKeyChange={setApiKey} />

      <div className="flex h-[calc(100vh-53px)]">
        <Sidebar
          characters={characters}
          dictionary={dictionary}
          onAddCharacter={() => setEditingChar({ ...DEFAULT_CHARACTER })}
          onEditCharacter={setEditingChar}
          onDeleteCharacter={deleteCharacter}
          onShowDict={() => setShowDict(true)}
          onExport={handleExport}
          onImport={handleImport}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <ScriptPanel
            scriptLines={scriptLines}
            detectedSpeakers={detectedSpeakers}
            speakerMap={speakerMap}
            characters={characters}
            onFileUpload={handleFileUpload}
            onSpeakerMapChange={setSpeakerMap}
          />
          <GenerationControls
            generation={generation}
            playback={playback}
            scriptLines={scriptLines}
            detectedSpeakers={detectedSpeakers}
            apiKey={apiKey}
          />
        </main>
      </div>

      {/* Modals */}
      {editingChar && (
        <CharacterEditor
          character={editingChar}
          onSave={saveCharacter}
          onCancel={() => setEditingChar(null)}
          onPreview={preview.previewVoice}
          isPreviewLoading={preview.isPreviewLoading}
        />
      )}
      {showDict && (
        <DictionaryManager
          dictionary={dictionary}
          setDictionary={setDictionary}
          onClose={() => setShowDict(false)}
        />
      )}
    </div>
  );
}
