"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState({ value, phase: "idle" });
  const shown = useRef(value);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const finish = () => {
      clearTimeout(timer);
      shown.current = value;
      setDisplay({ value, phase: "idle" });
    };
    const onPreference = () => { if (motion.matches) finish(); };
    const onVisibility = () => { if (document.hidden) finish(); };
    const start = shown.current;
    const distance = value - start;

    if (distance <= 0 || motion.matches || document.hidden) {
      finish();
      return;
    }

    // Visit every integer, slowing toward the final value. New scores continue
    // from the visible value; cleanup cancels the superseded sequence.
    const beat = Math.min(65, 650 / distance);
    let increment = 0;
    const tick = () => {
      if (cancelled) return;
      increment++;
      shown.current = start + increment;
      setDisplay({ value: shown.current, phase: increment === distance ? "land" : "tick" });
      if (increment < distance) timer = setTimeout(tick, beat * (0.55 + 1.5 * (increment / distance) ** 2));
    };
    timer = setTimeout(tick, 45);
    motion.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      motion.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [value]);

  return <strong aria-label={String(value)}><span key={`${display.value}-${display.phase}`} className={`score-digit score-${display.phase}`} aria-hidden="true">{display.value}</span></strong>;
}
