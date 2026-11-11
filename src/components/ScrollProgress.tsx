"use client";

import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          const ratio = max > 0 ? window.scrollY / max : 0;
          el.style.transform = `scaleX(${ratio})`;
          el.classList.toggle("on", window.scrollY > 24);
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div ref={ref} className="scroll-progress" aria-hidden="true" />;
}
