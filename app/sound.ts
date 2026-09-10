let context: AudioContext | null = null;
export function stopSound() {
  const previous = context;
  context = null;
  if (previous) void previous.close().catch(() => {});
}
export function unlockSound() {
  try {
    if (typeof window === "undefined" || !window.AudioContext) return;
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch { /* Sound must never interrupt gameplay. */ }
}
export function playSound(kind: "click" | "card" | "win" | "lose" | "push") {
  try {
    if (typeof document === "undefined" || document.hidden) return;
    unlockSound();
    const ctx = context;
    if (!ctx || ctx.state !== "running") return;
    const outcome = kind === "win" || kind === "lose";
    const tones = kind === "win" ? [523.25,783.99] : kind === "lose" ? [233.08,146.83] : kind === "push" ? [330,330] : kind === "card" ? [180] : [440];
    tones.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      const start = ctx.currentTime + index * (outcome ? 0.18 : 0.08);
      const duration = outcome ? (index === 0 ? 0.17 : 0.3) : 0.12;
      oscillator.type = kind === "lose" ? "sawtooth" : kind === "win" || kind === "card" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency,start);
      if (kind === "lose") oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88,start + duration);
      filter.type = "lowpass";
      filter.frequency.value = kind === "lose" ? 1000 : 4000;
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(kind === "lose" ? 0.035 : 0.06,start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,start + duration);
      oscillator.connect(filter).connect(gain).connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch { /* Audio failure must not report a failed game action. */ }
}
