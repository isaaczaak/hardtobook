"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UpcomingDrop } from "./time";

type Support = "unsupported" | "default" | "granted" | "denied";

/**
 * Optional browser notifications: while the tab is open, fire a notification
 * ~10 minutes before any starred drop. Degrades gracefully when the API is
 * unsupported or permission is denied. The single page tick drives `check`.
 */
export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [support, setSupport] = useState<Support>("default");
  // Remember which drops we've already alerted, keyed by id+dropAt.
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSupport("unsupported");
      return;
    }
    setSupport(Notification.permission as Support);
  }, []);

  const requestAndEnable = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSupport("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setSupport("granted");
      setEnabled(true);
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setSupport(result as Support);
      setEnabled(result === "granted");
    } catch {
      setSupport("denied");
    }
  }, []);

  const disable = useCallback(() => setEnabled(false), []);

  /**
   * Check starred upcoming drops against `now` and fire a 10-minute warning.
   * Called every tick by the DROPS view.
   */
  const check = useCallback(
    (starredDrops: UpcomingDrop[]) => {
      if (!enabled || support !== "granted") return;
      if (typeof window === "undefined" || !("Notification" in window)) return;

      for (const d of starredDrops) {
        const key = `${d.restaurant.id}:${d.dropAtMs}`;
        const minutes = d.msUntil / 60000;
        // Fire once when we cross into the 0–10 minute window.
        if (minutes <= 10 && minutes > 0 && !fired.current.has(key)) {
          fired.current.add(key);
          try {
            new Notification(`${d.restaurant.name} drops in ~10 min`, {
              body: `Tables open at ${d.restaurant.releaseTime} on ${d.restaurant.platform}. Get ready.`,
              tag: key,
            });
          } catch {
            /* ignore notification construction failures */
          }
        }
      }
    },
    [enabled, support]
  );

  return { enabled, support, requestAndEnable, disable, check };
}
