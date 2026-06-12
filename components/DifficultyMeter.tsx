/**
 * Five ticks; filled = difficulty. Ticks 4-5 tint rose to signal the hardest
 * spots. Color is never the only signal — a text label accompanies it.
 */
export function DifficultyMeter({ difficulty }: { difficulty: number }) {
  const level = Math.max(0, Math.min(5, Math.round(difficulty)));
  const hard = level >= 4;

  return (
    <span
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Difficulty ${level} out of 5`}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const on = i < level;
          return (
            <span
              key={i}
              className={[
                "h-2.5 w-1",
                on
                  ? hard
                    ? "bg-rose"
                    : "bg-stone-300"
                  : "bg-stone-800",
              ].join(" ")}
            />
          );
        })}
      </span>
      <span className="text-[10px] uppercase tracking-micro text-stone-500">
        {level}/5
      </span>
    </span>
  );
}
