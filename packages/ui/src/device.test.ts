// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useKeyboardInset, useOrientation } from './device';

let cleanup = () => {};
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  cleanup();
  cleanup = () => {};
  vi.unstubAllGlobals();
});

function renderHook<T>(useValue: () => T) {
  let current: T;
  const host = document.createElement('div');
  const root = createRoot(host);
  function Probe() {
    current = useValue();
    return null;
  }
  act(() => root.render(createElement(Probe)));
  cleanup = () => act(() => root.unmount());
  return { get current() { return current!; } };
}

describe('mobile device hooks', () => {
  test('tracks portrait and landscape changes and removes listeners', () => {
    Object.defineProperties(window, {
      innerWidth: { configurable: true, value: 390, writable: true },
      innerHeight: { configurable: true, value: 844, writable: true },
    });
    const orientation = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: orientation });
    const hook = renderHook(useOrientation);
    expect(hook.current).toBe('portrait');
    window.innerWidth = 844;
    window.innerHeight = 390;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(hook.current).toBe('landscape');
    cleanup();
    cleanup = () => {};
    expect(orientation.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(orientation.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('computes keyboard inset from visual viewport and responds to updates', () => {
    const listeners = new Map<string, EventListener>();
    const viewport = {
      height: 600,
      offsetTop: 20,
      addEventListener: vi.fn((name: string, listener: EventListener) => listeners.set(name, listener)),
      removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844, writable: true });
    const hook = renderHook(useKeyboardInset);
    expect(hook.current).toBe(224);
    viewport.height = 900;
    act(() => listeners.get('scroll')?.(new Event('scroll')));
    expect(hook.current).toBe(0);
    cleanup();
    cleanup = () => {};
    expect(viewport.removeEventListener).toHaveBeenCalledTimes(2);
  });

  test('returns zero when visual viewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    expect(renderHook(useKeyboardInset).current).toBe(0);
  });
});
