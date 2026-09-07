import { useEffect, useState } from 'react';

export function useOrientation() {
  const read = () => typeof window === 'undefined' || window.innerHeight >= window.innerWidth ? 'portrait' as const : 'landscape' as const;
  const [orientation, setOrientation] = useState(read);
  useEffect(() => {
    const update = () => setOrientation(read());
    window.addEventListener('resize', update);
    window.screen.orientation?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.screen.orientation?.removeEventListener?.('change', update);
    };
  }, []);
  return orientation;
}

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}
