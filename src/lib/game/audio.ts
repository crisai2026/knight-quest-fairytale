/**
 * Tiny procedural audio engine — all music and sound effects are synthesised
 * with WebAudio oscillators/noise, so the game ships with no audio files.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ------------------------------ sound effects ----------------------------- */

type ToneOpts = {
  type?: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  volume?: number;
  delay?: number;
};

function tone({ type = "sine", from, to, duration, volume = 0.3, delay = 0 }: ToneOpts) {
  const ac = getCtx();
  if (!ac || !sfxGain || !enabled) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + Math.min(0.04, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(sfxGain);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noise(duration: number, filter: BiquadFilterType, freq: number, volume = 0.3, delay = 0, sweepTo?: number) {
  const ac = getCtx();
  if (!ac || !sfxGain || !enabled) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, Math.max(0.1, duration));
  const biquad = ac.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(freq, t);
  if (sweepTo !== undefined) biquad.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  src.connect(biquad).connect(gain).connect(sfxGain);
  src.start(t);
  src.stop(t + duration + 0.05);
}

export const sfx = {
  /** Furry horned monster — a gruff roar. */
  furryHit() {
    tone({ type: "sawtooth", from: 220, to: 90, duration: 0.42, volume: 0.28 });
    tone({ type: "square", from: 150, to: 70, duration: 0.36, volume: 0.14, delay: 0.03 });
    noise(0.35, "lowpass", 700, 0.16);
  },
  /** Tentacle monster — a wet squish. */
  tentacleHit() {
    tone({ type: "sine", from: 700, to: 120, duration: 0.22, volume: 0.24 });
    noise(0.18, "bandpass", 900, 0.22, 0, 200);
    tone({ type: "sine", from: 300, to: 80, duration: 0.18, volume: 0.16, delay: 0.1 });
  },
  /** Fish monster — a splash. */
  fishHit() {
    noise(0.4, "highpass", 900, 0.32, 0, 2600);
    noise(0.25, "bandpass", 1800, 0.2, 0.05);
    tone({ type: "sine", from: 900, to: 260, duration: 0.2, volume: 0.1 });
  },
  /** Winged monster — a screech. */
  wingedHit() {
    tone({ type: "sawtooth", from: 1400, to: 2600, duration: 0.12, volume: 0.2 });
    tone({ type: "sawtooth", from: 2600, to: 900, duration: 0.22, volume: 0.18, delay: 0.1 });
    noise(0.2, "highpass", 2500, 0.12, 0.05);
  },
  /** Crab-clawed insect — a scratchy screech. */
  insectHit() {
    for (let i = 0; i < 4; i++) {
      tone({ type: "square", from: 1800 + i * 120, to: 2400, duration: 0.05, volume: 0.12, delay: i * 0.055 });
    }
    noise(0.25, "highpass", 3000, 0.16);
  },
  dragonRoar(volume = 0.4) {
    tone({ type: "sawtooth", from: 130, to: 48, duration: 1.1, volume });
    tone({ type: "square", from: 90, to: 40, duration: 1.0, volume: volume * 0.5, delay: 0.05 });
    noise(0.9, "lowpass", 500, volume * 0.5);
  },
  dragonFire() {
    noise(0.9, "bandpass", 500, 0.3, 0, 1800);
    noise(0.7, "lowpass", 900, 0.22, 0.1);
  },
  explosion() {
    noise(0.7, "lowpass", 800, 0.4, 0, 90);
    tone({ type: "square", from: 120, to: 40, duration: 0.5, volume: 0.2 });
  },
  coin() {
    tone({ type: "square", from: 990, duration: 0.07, volume: 0.16 });
    tone({ type: "square", from: 1480, duration: 0.12, volume: 0.16, delay: 0.07 });
  },
  /** Triumphant chime when the victory flag is taken. */
  flagRaise() {
    tone({ type: "triangle", from: 523, duration: 0.14, volume: 0.18 });
    tone({ type: "triangle", from: 659, duration: 0.14, volume: 0.18, delay: 0.12 });
    tone({ type: "triangle", from: 784, duration: 0.16, volume: 0.18, delay: 0.24 });
    tone({ type: "triangle", from: 1047, duration: 0.35, volume: 0.2, delay: 0.36 });
  },
  /** Mario-style level-clear fanfare played while the knight celebrates. */
  victoryFanfare(big = false) {
    const notes = big
      ? [523, 659, 784, 1047, 880, 1047, 1319]
      : [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => {
      tone({ type: "square", from: n, duration: 0.16, volume: 0.16, delay: i * 0.15 });
      tone({ type: "triangle", from: n / 2, duration: 0.16, volume: 0.12, delay: i * 0.15 });
    });
    tone({
      type: "triangle",
      from: big ? 1568 : 1319,
      duration: 0.7,
      volume: 0.2,
      delay: notes.length * 0.15,
    });
  },
  /** Gentle harp pluck as the storybook turns a page. */
  pageTurn() {
    tone({ type: "triangle", from: 784, duration: 0.5, volume: 0.1 });
    tone({ type: "sine", from: 1175, duration: 0.4, volume: 0.06, delay: 0.06 });
    noise(0.14, "lowpass", 900, 0.03, 0.02);
  },
  /** Wizard magic snapping the portal shut. */
  portalSeal() {
    tone({ type: "sawtooth", from: 900, to: 120, duration: 0.5, volume: 0.2 });
    tone({ type: "square", from: 300, to: 80, duration: 0.4, volume: 0.14, delay: 0.1 });
    noise(0.4, "lowpass", 600, 0.2, 0.05);
  },
  /** A gust of wind sweeping through the trees. */
  gust() {
    noise(1.1, "bandpass", 700, 0.18, 0, 300);
    noise(0.9, "highpass", 1600, 0.08, 0.15);
  },
  /** Springy bounce off a mushroom. */
  bounce() {
    tone({ type: "square", from: 300, to: 900, duration: 0.18, volume: 0.2 });
    tone({ type: "triangle", from: 150, to: 450, duration: 0.18, volume: 0.14, delay: 0.02 });
  },
  hurt() {
    tone({ type: "square", from: 320, to: 120, duration: 0.2, volume: 0.2 });
  },
  chest() {
    tone({ type: "triangle", from: 520, duration: 0.1, volume: 0.16 });
    tone({ type: "triangle", from: 780, duration: 0.16, volume: 0.16, delay: 0.09 });
  },
  /** Crunchy bite when the knight eats food. */
  eat() {
    noise(0.12, "bandpass", 1200, 0.18, 0, 600);
    tone({ type: "triangle", from: 300, to: 480, duration: 0.12, volume: 0.14, delay: 0.06 });
  },
  talk() {
    tone({ type: "square", from: 420, to: 520, duration: 0.07, volume: 0.1 });
  },
  buy() {
    tone({ type: "triangle", from: 660, duration: 0.08, volume: 0.16 });
    tone({ type: "triangle", from: 880, duration: 0.08, volume: 0.16, delay: 0.08 });
    tone({ type: "triangle", from: 1320, duration: 0.18, volume: 0.16, delay: 0.16 });
  },
  deny() {
    tone({ type: "square", from: 200, to: 120, duration: 0.2, volume: 0.15 });
  },
  /** Two soft descending hoots — a distant owl in the dark forest. */
  owl() {
    tone({ type: "sine", from: 420, to: 330, duration: 0.35, volume: 0.16 });
    tone({ type: "sine", from: 360, to: 280, duration: 0.4, volume: 0.14, delay: 0.42 });
  },
};

export function playOwlHoot() {
  sfx.owl();
}

/* ---------------------------------- music --------------------------------- */

export type MusicTrack = "cheery" | "creepy" | "fire" | "rock" | "beautiful" | null;

type TrackDef = {
  stepMs: number;
  wave: OscillatorType;
  lead: (number | null)[];
  bass: (number | null)[];
  gain: number;
};

const N = (name: string) => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 440;
  const semitone = names.indexOf(m[1]!) + (Number(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (semitone - 69) / 12);
};

const n = (s: string | null) => (s ? N(s) : null);

const TRACKS: Record<Exclude<MusicTrack, null>, TrackDef> = {
  cheery: {
    stepMs: 190,
    wave: "square",
    gain: 0.16,
    lead: ["C5", "E5", "G5", "E5", "F5", "A5", "G5", "E5", "D5", "F5", "A5", "F5", "E5", "G5", "C6", "G5"].map(n),
    bass: ["C3", null, "G2", null, "F2", null, "C3", null, "D3", null, "A2", null, "G2", null, "G2", null].map(n),
  },
  creepy: {
    stepMs: 420,
    wave: "triangle",
    gain: 0.13,
    lead: ["A3", null, "C4", null, "A3", "G#3", null, null, "F3", null, "E3", null, null, "D#3", null, null].map(n),
    bass: ["A1", null, null, null, "F1", null, null, null, "D1", null, null, null, "E1", null, null, null].map(n),
  },
  fire: {
    stepMs: 500,
    wave: "sine",
    gain: 0.07,
    lead: [null, null, null, null, null, null, null, null].map(n),
    bass: ["C1", null, null, null, "C1", null, null, null].map(n),
  },
  rock: {
    stepMs: 140,
    wave: "sawtooth",
    gain: 0.14,
    lead: [
      "E3", "E3", "G3", "E3", "A3", "E3", "G3", "A#3",
      "E3", "E3", "G3", "E3", "D4", "C4", "B3", "A3",
    ].map(n),
    bass: ["E1", "E1", "E1", "E1", "A1", "A1", "G1", "G1", "E1", "E1", "E1", "E1", "B1", "B1", "C2", "D2"].map(n),
  },
  beautiful: {
    stepMs: 340,
    wave: "triangle",
    gain: 0.15,
    lead: ["G4", "B4", "D5", "G5", "F#5", "D5", "B4", "D5", "E5", "C5", "A4", "C5", "B4", "G4", "D5", "B4"].map(n),
    bass: ["G2", null, "D3", null, "E2", null, "B2", null, "C3", null, "G2", null, "D3", null, "D3", null].map(n),
  },
};

let currentTrack: MusicTrack = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let fireLoop: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

function playMusicNote(freq: number, wave: OscillatorType, ms: number, volume: number) {
  const ac = getCtx();
  if (!ac || !musicGain) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  const dur = ms / 1000;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
  osc.connect(gain).connect(musicGain);
  osc.start(t);
  osc.stop(t + dur);
}

function startFireAmbience() {
  const ac = getCtx();
  if (!ac || !musicGain || fireLoop) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 2);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  const gain = ac.createGain();
  gain.gain.value = 0.5;
  src.connect(filter).connect(gain).connect(musicGain);
  src.start();
  fireLoop = { src, gain };
}

function stopFireAmbience() {
  if (!fireLoop) return;
  try {
    fireLoop.src.stop();
  } catch {
    /* already stopped */
  }
  fireLoop = null;
}

function runTrack(track: Exclude<MusicTrack, null>) {
  const def = TRACKS[track];
  step = 0;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!enabled) return;
    const lead = def.lead[step % def.lead.length];
    const bass = def.bass[step % def.bass.length];
    if (lead) playMusicNote(lead, def.wave, def.stepMs * 0.9, def.gain);
    if (bass) playMusicNote(bass, "triangle", def.stepMs * 1.6, def.gain * 1.1);
    step++;
  }, def.stepMs);
}

export function playMusic(track: MusicTrack) {
  if (track === currentTrack) return;
  currentTrack = track;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopFireAmbience();
  if (!track) return;
  if (!enabled) return;
  getCtx();
  if (track === "fire") startFireAmbience();
  runTrack(track);
}

export function stopMusic() {
  playMusic(null);
}

export function setMusicEnabled(value: boolean) {
  enabled = value;
  if (!value) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    stopFireAmbience();
  } else if (currentTrack) {
    const track = currentTrack;
    currentTrack = null;
    playMusic(track);
  }
}

export function isMusicEnabled() {
  return enabled;
}

/** Called on the first key/click so the browser lets us make noise. */
export function unlockAudio() {
  getCtx();
  if (enabled && currentTrack && !timer) {
    const track = currentTrack;
    currentTrack = null;
    playMusic(track);
  }
}
