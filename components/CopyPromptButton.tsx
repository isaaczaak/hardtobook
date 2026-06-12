"use client";

import { useEffect, useRef, useState } from "react";

const COPIED_MS = 1500;

/** Copy `text` to the clipboard, with a legacy execCommand fallback. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Ghost-styled button that copies a ready-made agent prompt to the clipboard
 * and briefly flips its label to "COPIED". Stone treatment only — rose is
 * reserved for live/urgent states.
 */
export function CopyPromptButton({
  text,
  label = "COPY AGENT PROMPT",
  compact = false,
  className = "",
}: {
  text: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  const sizing = compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      title="Paste into Claude or ChatGPT"
      aria-live="polite"
      className={[
        "inline-flex min-h-[44px] items-center justify-center border border-stone-700",
        "uppercase tracking-micro text-paper",
        "transition-colors duration-200 hover:border-stone-500 hover:bg-stone-900",
        sizing,
        className,
      ].join(" ")}
    >
      {copied ? "COPIED" : label}
    </button>
  );
}
