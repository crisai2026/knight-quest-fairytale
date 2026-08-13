let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Two soft descending hoots — a distant owl in the dark forest. */
export function playOwlHoot() {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  for (const [offset, freq] of [
    [0, 420],
    [0.42, 360],
  ] as const) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + offset);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + offset + 0.3);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.34);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.4);
  }
}
