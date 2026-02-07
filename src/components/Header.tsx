// src/components/Header.tsx
// Application header with app title, API key input, and auth controls.
// Shows Google login button when Firebase is configured.
// When logged in, displays user avatar, name, and sync status indicator.

import { useState } from "react";
import type { User } from "firebase/auth";
import { IconWave, IconCloud, IconLogout } from "./icons";
import { isFirebaseConfigured } from "@/lib/firebase";

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  user: User | null;
  isAuthLoading: boolean;
  isSynced: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function Header({
  apiKey, onApiKeyChange,
  user, isAuthLoading, isSynced,
  onSignIn, onSignOut,
}: HeaderProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <header className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      {/* App title */}
      <div className="flex items-center gap-3">
        <div className="text-amber-500">
          <IconWave />
        </div>
        <h1 className="m-0 text-lg font-bold bg-gradient-to-br from-amber-500 to-amber-400 bg-clip-text text-transparent">
          みんなのマンション　会話音声生成ツール
        </h1>
        <span className="text-[10px] text-slate-600 px-2 py-0.5 border border-slate-700 rounded">
          Gemini TTS
        </span>
      </div>

      {/* Right side: API key + auth */}
      <div className="flex items-center gap-4">
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

        {/* Auth controls — only shown when Firebase is configured */}
        {isFirebaseConfigured && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
            {isAuthLoading ? (
              <span className="text-xs text-slate-500">...</span>
            ) : user ? (
              <>
                {/* Sync indicator */}
                <div className={`${isSynced ? "text-green-400" : "text-slate-500"}`} title={isSynced ? "同期済み" : "未同期"}>
                  <IconCloud />
                </div>
                {/* User avatar */}
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                    {user.displayName?.[0] ?? "U"}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer font-sans"
                  title="ログアウト"
                >
                  <IconLogout />
                </button>
              </>
            ) : (
              <button
                onClick={onSignIn}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 cursor-pointer font-sans transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
