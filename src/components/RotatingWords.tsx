"use client";

import { useEffect, useState } from "react";

export type RotatingVariant = "slide-down" | "slide-up" | "fade-blur" | "flip" | "rotate-down" | "zoom" | "letters";

// Classes for the two off-screen states of each variant. "wait" = queued (no transition, so it can jump
// to its start position unseen); "prev" = the word that is leaving (animates out).
const VARIANTS: Record<RotatingVariant, { wait: string; prev: string }> = {
  "slide-down": { wait: "-translate-y-full opacity-0", prev: "translate-y-full opacity-0" },
  "slide-up": { wait: "translate-y-full opacity-0", prev: "-translate-y-full opacity-0" },
  "fade-blur": { wait: "opacity-0 blur-md", prev: "opacity-0 blur-md" },
  flip: { wait: "opacity-0 [transform:rotateX(-90deg)]", prev: "opacity-0 [transform:rotateX(90deg)]" },
  "rotate-down": {
    wait: "opacity-0 [transform:translateY(-70%)_rotateX(-90deg)]",
    prev: "opacity-0 [transform:translateY(70%)_rotateX(90deg)]",
  },
  zoom: { wait: "opacity-0 scale-75", prev: "opacity-0 scale-125" },
  letters: { wait: "opacity-0", prev: "opacity-0" },
};

const GRADIENT = "bg-gradient-to-r from-[#2bb39a] to-[#0096c4] bg-clip-text text-transparent";

// Cycles through `words`, animating each change with the chosen `variant`.
export function RotatingWords({
  words,
  interval = 2400,
  variant = "slide-down",
}: {
  words: string[];
  interval?: number;
  variant?: RotatingVariant;
}) {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        setPrev(i);
        return (i + 1) % words.length;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  const letters = variant === "letters";

  return (
    <span
      className="relative inline-grid overflow-clip align-baseline text-left"
      style={variant === "flip" || variant === "rotate-down" ? { perspective: "600px" } : undefined}
    >
      {words.map((w, i) => {
        const state = i === index ? "current" : i === prev ? "prev" : "wait";
        return (
          <span
            key={w}
            aria-hidden={state !== "current"}
            className={[
              "col-start-1 row-start-1 whitespace-nowrap pb-[0.1em]",
              letters ? "text-[#2bb39a]" : GRADIENT,
              state === "current" && !letters && "opacity-100 translate-y-0 scale-100 blur-0 [transform:none] transition duration-500 ease-out",
              state === "current" && letters && "opacity-100",
              state === "prev" && `${VARIANTS[variant].prev} transition duration-300 ease-in`,
              state === "wait" && VARIANTS[variant].wait,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {letters && state === "current"
              ? Array.from(w).map((c, k) => (
                  <span key={`${index}-${k}`} className="letter-drop" style={{ animationDelay: `${k * 40}ms` }}>
                    {c === " " ? " " : c}
                  </span>
                ))
              : w}
          </span>
        );
      })}
    </span>
  );
}
