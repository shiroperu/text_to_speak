// src/components/Header.tsx
// Application header with app title and API key input.
// The API key is stored client-side only (never sent to a server).

import { useState } from "react";
import { IconWave } from "./icons";

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function Header({ apiKey, onApiKeyChange }: HeaderProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <header className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      {/* App title */}
      <div className="flex items-center gap-3">
        <div className="text-amber-500">
          <IconWave />
        </div>
        <h1 className="m-0 text-lg font-bold bg-gradient-to-br from-amber-500 to-amber-400 bg-clip-text text-transparent">
          VoiceCast Studio
        </h1>
        <span className="text-[10px] text-slate-600 px-2 py-0.5 border border-slate-700 rounded">
          Gemini TTS
        </span>
      </div>

      {/* API Key input */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Gemini API Key"
            className="w-70 py-1.5 pl-3 pr-20 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs font-sans"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-slate-500 text-[11px] cursor-pointer font-sans"
          >
            {showApiKey ? "隠す" : "表示"}
          </button>
        </div>
        {apiKey && (
          <div className="w-2 h-2 rounded-full bg-green-500" title="API Key設定済み" />
        )}
      </div>
    </header>
  );
}
