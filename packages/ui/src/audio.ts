import { useCallback, useEffect, useRef, useState } from 'react';

type Cue = 'tap' | 'select' | 'combine' | 'success' | 'unlock' | 'complete';
type MiniappAudioOptions = { storageKey: string; tempo?: number; notes?: number[] };

const cueNotes: Record<Cue, number[]> = {
  tap: [440], select: [523.25], combine: [392, 523.25, 659.25], success: [523.25, 659.25, 783.99], unlock: [659.25, 880], complete: [392, 523.25, 659.25, 987.77],
};

export function useMiniappAudio({ storageKey, tempo = 76, notes = [220, 261.63, 329.63, 293.66] }: MiniappAudioOptions) {
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const index = useRef(0);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMutedState] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem(storageKey) === 'muted');

  const tone = useCallback((frequency: number, duration = 0.09, gain = 0.035) => {
    const audio = context.current;
    if (!audio || muted) return;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(gain, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }, [muted]);

  const stopBed = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const startBed = useCallback(() => {
    stopBed();
    if (muted || !context.current) return;
    const beat = Math.round(60_000 / tempo);
    timer.current = window.setInterval(() => {
      tone(notes[index.current % notes.length]!, Math.min(1.8, beat / 650), 0.012);
      index.current += 1;
    }, beat * 2);
  }, [muted, notes, stopBed, tempo, tone]);

  const unlock = useCallback(async () => {
    if (typeof window === 'undefined') return;
    context.current ??= new AudioContext();
    await context.current.resume();
    setUnlocked(true);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    localStorage.setItem(storageKey, next ? 'muted' : 'audible');
  }, [storageKey]);

  const play = useCallback((cue: Cue) => {
    cueNotes[cue].forEach((frequency, offset) => window.setTimeout(() => tone(frequency, cue === 'complete' ? 0.35 : 0.12, 0.045), offset * 85));
  }, [tone]);

  useEffect(() => {
    if (unlocked && !muted) startBed(); else stopBed();
    return stopBed;
  }, [muted, startBed, stopBed, unlocked]);

  useEffect(() => () => { stopBed(); void context.current?.close(); }, [stopBed]);
  return { muted, unlocked, unlock, setMuted, toggleMuted: () => setMuted(!muted), play };
}
