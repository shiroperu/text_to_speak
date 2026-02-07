// src/hooks/useFirestoreSync.ts
// Custom hook for syncing app data (apiKey, characters, dictionary) to Firestore.
// When logged in: reads from Firestore on mount, writes changes with debounce.
// When logged out or Firebase not configured: no-op (localStorage handles persistence).
// On first login with empty Firestore: merges localStorage data into Firestore.

import { useEffect, useRef, useCallback, useState } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { UserData, Character, DictionaryEntry } from "@/types";
import { db } from "@/lib/firebase";

/** Debounce delay for Firestore writes (ms) */
const SAVE_DEBOUNCE_MS = 1000;

interface UseFirestoreSyncParams {
  user: User | null;
  apiKey: string;
  characters: Character[];
  dictionary: DictionaryEntry[];
  setApiKey: (key: string) => void;
  setCharacters: (chars: Character[]) => void;
  setDictionary: (entries: DictionaryEntry[]) => void;
}

export interface UseFirestoreSyncReturn {
  isSynced: boolean;
}

/**
 * Syncs app data to/from Firestore for the logged-in user.
 * - On login: loads Firestore data (or migrates localStorage data if Firestore is empty)
 * - On data change: debounced write to Firestore
 * - On logout: stops listening, keeps localStorage intact
 */
export function useFirestoreSync({
  user, apiKey, characters, dictionary,
  setApiKey, setCharacters, setDictionary,
}: UseFirestoreSyncParams): UseFirestoreSyncReturn {
  const [isSynced, setIsSynced] = useState(false);
  // Track whether we're currently applying remote data to avoid write loops
  const isApplyingRemote = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reference to the user's Firestore document
  const getUserDocRef = useCallback(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [user]);

  // --- Initial load: read from Firestore or migrate localStorage data ---
  useEffect(() => {
    if (!user || !db) {
      setIsSynced(false);
      return;
    }

    const docRef = getUserDocRef();
    if (!docRef) return;

    let unsubscribe: (() => void) | undefined;

    // Load initial data, then start listening for changes
    (async () => {
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        // Firestore has data — apply it to state
        const data = snapshot.data() as UserData;
        isApplyingRemote.current = true;
        if (data.apiKey !== undefined) setApiKey(data.apiKey);
        if (data.characters) setCharacters(data.characters);
        if (data.dictionary) setDictionary(data.dictionary);
        // Allow React to process state updates before clearing the flag
        setTimeout(() => { isApplyingRemote.current = false; }, 0);
      } else {
        // Firestore is empty — migrate current localStorage data
        await setDoc(docRef, { apiKey, characters, dictionary } satisfies UserData);
      }

      setIsSynced(true);

      // Listen for real-time updates (e.g. changes from another device)
      unsubscribe = onSnapshot(docRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as UserData;
        isApplyingRemote.current = true;
        if (data.apiKey !== undefined) setApiKey(data.apiKey);
        if (data.characters) setCharacters(data.characters);
        if (data.dictionary) setDictionary(data.dictionary);
        setTimeout(() => { isApplyingRemote.current = false; }, 0);
      });
    })();

    return () => {
      unsubscribe?.();
      setIsSynced(false);
    };
    // Only re-run when user changes (login/logout), not on data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Debounced write to Firestore on local data changes ---
  useEffect(() => {
    // Skip if: no user, applying remote data, or not yet synced
    if (!user || !db || isApplyingRemote.current || !isSynced) return;

    const docRef = getUserDocRef();
    if (!docRef) return;

    // Clear previous debounce timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      setDoc(docRef, { apiKey, characters, dictionary } satisfies UserData)
        .catch((err) => console.error("Firestore save failed:", err));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [apiKey, characters, dictionary, user, isSynced, getUserDocRef]);

  return { isSynced };
}
