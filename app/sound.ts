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
export function playSound(kind: "click" | "card" | "win" | "lose" | "push" | "result-good" | "result-bad") {
  try {
    if (typeof document === "undefined" || document.hidden) return;
    unlockSound();
    const ctx = context;
    if (!ctx || ctx.state !== "running") return;
    const outcome = kind === "win" || kind === "lose";
    const finale = kind === "result-good" || kind === "result-bad";
    const rough = kind === "lose" || kind === "result-bad";
    const tones = kind === "result-good" ? [392,523.25,659.25,783.99] : kind === "result-bad" ? [293.66,261.63,220,146.83] : kind === "win" ? [523.25,783.99] : kind === "lose" ? [233.08,146.83] : kind === "push" ? [330,330] : kind === "card" ? [180] : [440];
    tones.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      const start = ctx.currentTime + index * (finale ? 0.3 : outcome ? 0.18 : 0.08);
      const duration = finale ? (index === tones.length - 1 ? 0.7 : 0.28) : outcome ? (index === 0 ? 0.17 : 0.3) : 0.12;
      oscillator.type = rough ? "sawtooth" : kind === "win" || kind === "card" || finale ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency,start);
      if (rough) oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88,start + duration);
      filter.type = "lowpass";
      filter.frequency.value = rough ? 1000 : 4000;
      gain.gain.setValueAtTime(0.0001,start);
      gain.gain.exponentialRampToValueAtTime(rough ? 0.035 : 0.06,start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,start + duration);
      oscillator.connect(filter).connect(gain).connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch { /* Audio failure must not report a failed game action. */ }
}
