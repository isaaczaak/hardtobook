"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "htb:watchlist";

/**
 * localStorage-backed set of starred restaurant ids.
 *
 * SSR-safe: starts empty (matching the server render) and hydrates from
 * localStorage after mount. Syncs across tabs via the `storage` event.
 */
export function useWatchlist() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage after mount only.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      // Corrupt or unavailable storage — start empty, don't crash.
    }
    setHydrated(true);
  }, []);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : [];
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((x): x is string => typeof x === "string"));
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be full or blocked — keep in-memory state regardless */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isStarred = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, isStarred, toggle, hydrated };
}
