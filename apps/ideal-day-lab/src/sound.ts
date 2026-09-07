// Ideal Day Lab — synthesized UI sound effects.
// All sounds are generated with the Web Audio API (no audio assets, no
// network). The palette is deliberately small and quiet to match the
// mono-poster aesthetic: short blips and gentle two/three-note cues.

export type SoundName =
  | 'step'    // stepper tick, drag snap, keyboard move
  | 'apply'   // exact duration applied, block turned to open time
  | 'cancel'  // edit cancelled / dismissed
  | 'warn'    // blocked action (overlap, at a limit)
  | 'delete'  // block deleted
  | 'split'   // block split
  | 'undo'
  | 'redo'
  | 'enter'   // hero → editor
  | 'success'; // saved / shared / personality generated

type Tone = {
  f: number;              // start frequency (Hz)
  g?: number;             // glide-to frequency
  at?: number;            // start offset (s)
  d: number;              // duration (s)
  type?: OscillatorType;  // waveform
  v: number;              // peak volume (gain)
};

const PATTERNS: Record<SoundName, readonly Tone[]> = {
  step:    [{ f: 980, d: 0.045, v: 0.05, type: 'square' }],
  apply:   [{ f: 587, d: 0.09, v: 0.07 }, { f: 880, at: 0.08, d: 0.12, v: 0.07 }],
  cancel:  [{ f: 415, g: 311, d: 0.1, v: 0.05 }],
  warn:    [{ f: 311, d: 0.07, v: 0.06, type: 'triangle' }, { f: 233, at: 0.09, d: 0.1, v: 0.06, type: 'triangle' }],
  delete:  [{ f: 262, g: 131, d: 0.22, v: 0.09, type: 'triangle' }],
  split:   [{ f: 440, d: 0.06, v: 0.06 }, { f: 659, at: 0.06, d: 0.09, v: 0.06 }],
  undo:    [{ f: 330, g: 220, d: 0.09, v: 0.05 }],
  redo:    [{ f: 220, g: 330, d: 0.09, v: 0.05 }],
  enter:   [{ f: 523, d: 0.08, v: 0.06 }, { f: 659, at: 0.07, d: 0.08, v: 0.06 }, { f: 784, at: 0.14, d: 0.14, v: 0.06 }],
  success: [{ f: 523, d: 0.09, v: 0.06 }, { f: 659, at: 0.08, d: 0.09, v: 0.06 }, { f: 784, at: 0.16, d: 0.1, v: 0.06 }, { f: 1046, at: 0.24, d: 0.22, v: 0.05 }],
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try { muted = localStorage.getItem('ideal-day-lab.sound') === 'off'; } catch { /* noop */ }

const STORE_KEY = 'ideal-day-lab.sound';
let lastTick = 0;

const ensure = (): AudioContext | null => {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      const bed = ctx.createGain();
      bed.gain.value = 0.012;
      bed.connect(master);
      const ambient = ctx.createOscillator();
      ambient.type = 'triangle';
      ambient.frequency.value = 73.42;
      ambient.connect(bed);
      ambient.start();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
};

const tone = (c: AudioContext, m: GainNode, t: Tone) => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = t.type ?? 'sine';
  const start = c.currentTime + (t.at ?? 0);
  osc.frequency.setValueAtTime(t.f, start);
  if (t.g) osc.frequency.exponentialRampToValueAtTime(t.g, start + t.d);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(t.v, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + t.d);
  osc.connect(gain);
  gain.connect(m);
  osc.start(start);
  osc.stop(start + t.d + 0.05);
};

const play = (name: SoundName) => {
  const c = ensure();
  if (!c || !master) return;
  // The hold-to-repeat stepper accelerates down to ~45ms per step; the
  // throttle only exists to tame drag-snap floods, so it must sit below
  // that floor or fast repeats start skipping ticks.
  const now = performance.now();
  if (name === 'step' && now - lastTick < 40) return;
  if (name === 'step') lastTick = now;
  for (const t of PATTERNS[name]) tone(c, master, t);
  try { (window as unknown as { __soundCount?: number }).__soundCount = ((window as unknown as { __soundCount?: number }).__soundCount ?? 0) + 1; } catch { /* noop */ }
};

const persist = () => { try { localStorage.setItem(STORE_KEY, muted ? 'off' : 'on'); } catch { /* noop */ } };

export const sound = {
  play,
  get muted() { return muted; },
  /** @returns the new muted state */
  toggle(): boolean {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.8;
    if (!muted) ensure();
    persist();
    return muted;
  },
};
