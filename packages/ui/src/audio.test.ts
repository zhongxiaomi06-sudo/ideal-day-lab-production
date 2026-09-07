// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useMiniappAudio } from './audio';

const oscillator = () => ({
  type: '',
  frequency: { value: 0 },
  connect: vi.fn(function (this: unknown) { return this; }),
  start: vi.fn(),
  stop: vi.fn(),
});
const gain = () => ({
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(function (this: unknown) { return this; }),
});

let cleanup = () => {};
let storage: Storage;
beforeEach(() => {
  const values = new Map<string, string>();
  storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('localStorage', storage);
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
});
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.useRealTimers();
  storage.clear();
  vi.unstubAllGlobals();
});

function renderAudio(storageKey = 'audio-test') {
  let current: ReturnType<typeof useMiniappAudio>;
  const host = document.createElement('div');
  const root = createRoot(host);
  function Probe() {
    current = useMiniappAudio({ storageKey, tempo: 120, notes: [220, 330] });
    return null;
  }
  act(() => root.render(createElement(Probe)));
  cleanup = () => act(() => root.unmount());
  return { get current() { return current!; } };
}

describe('miniapp audio hook', () => {
  test('unlocks, schedules bed and cues, persists mute, and closes cleanly', async () => {
    vi.useFakeTimers();
    const createdOscillators: ReturnType<typeof oscillator>[] = [];
    const audioContext = {
      currentTime: 1,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(() => { const value = oscillator(); createdOscillators.push(value); return value; }),
      createGain: vi.fn(gain),
    };
    class AudioContextMock { constructor() { return audioContext; } }
    vi.stubGlobal('AudioContext', AudioContextMock);

    const hook = renderAudio();
    expect(hook.current.muted).toBe(false);
    await act(async () => hook.current.unlock());
    expect(hook.current.unlocked).toBe(true);
    act(() => {
      hook.current.play('complete');
      vi.advanceTimersByTime(1_100);
    });
    expect(createdOscillators.length).toBeGreaterThanOrEqual(5);
    expect(createdOscillators.every((item) => item.start.mock.calls.length === 1)).toBe(true);

    act(() => hook.current.toggleMuted());
    expect(hook.current.muted).toBe(true);
    expect(localStorage.getItem('audio-test')).toBe('muted');
    act(() => hook.current.setMuted(false));
    expect(localStorage.getItem('audio-test')).toBe('audible');
    cleanup();
    cleanup = () => {};
    expect(audioContext.close).toHaveBeenCalledOnce();
  });

  test('starts muted from persisted preference and keeps silent cues silent', () => {
    vi.useFakeTimers();
    localStorage.setItem('persisted-audio', 'muted');
    const hook = renderAudio('persisted-audio');
    expect(hook.current.muted).toBe(true);
    act(() => {
      hook.current.play('tap');
      vi.runAllTimers();
    });
    expect(hook.current.unlocked).toBe(false);
  });
});
