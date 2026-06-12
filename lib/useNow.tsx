"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * A single page-level 1-second tick. `now` is null until the component mounts,
 * which lets time-dependent UI render a stable placeholder on the server and
 * avoid hydration mismatches.
 */
const NowContext = createContext<number | null>(null);

export function NowProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<number | null>(null);
  const listeners = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    listeners.current = true;
    return () => clearInterval(id);
  }, []);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/** Returns the shared `now` epoch ms, or null before mount. */
export function useNow(): number | null {
  return useContext(NowContext);
}
