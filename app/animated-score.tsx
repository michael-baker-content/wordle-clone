"use client";

import { useEffect, useRef, useState } from "react";

export default function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState({ value, phase: "idle", direction: "up" });
  const shown = useRef(value);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const start = shown.current;
    const delta = value - start;
    const direction = delta < 0 ? "down" : "up";
    const finish = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      shown.current = value;
      setDisplay({ value, phase: "idle", direction });
    };
    const onPreference = () => { if (motion.matches) finish(); };
    const onVisibility = () => { if (document.hidden) finish(); };

    if (!delta || motion.matches || document.hidden) {
      finish();
      return;
    }

    // Time-based easing stays smooth for large deductions and crossing zero.
    // A new update continues from the currently displayed number.
    const duration = Math.min(2200, 800 + Math.sqrt(Math.abs(delta)) * 90);
    const started = performance.now();
    setDisplay({ value: start, phase: "count", direction });
    const tick = (now: number) => {
      if (cancelled) return;
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 2);
      const amount = progress === 1 ? Math.abs(delta) : Math.min(Math.abs(delta) - 1, Math.floor(Math.abs(delta) * eased));
      shown.current = start + Math.sign(delta) * amount;
      setDisplay({ value: shown.current, phase: progress === 1 ? "land" : "count", direction });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else timer = setTimeout(finish, 950);
    };
    frame = requestAnimationFrame(tick);
    motion.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      motion.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [value]);

  return <strong aria-label={String(value)}><span className={`score-digit score-${display.direction} score-${display.phase}`} aria-hidden="true">{display.value}</span></strong>;
}
