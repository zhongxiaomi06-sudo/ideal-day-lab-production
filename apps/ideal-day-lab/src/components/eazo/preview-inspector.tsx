import { useEffect } from 'react';

/**
 * Preview inspector — Eazo preview tooling bridge.
 *
 * postMessage contract (prefix `eazo-preview-inspect-`):
 *
 *   host → app
 *     { type: 'eazo-preview-inspect-arm' }                     arm the inspector
 *     { type: 'eazo-preview-inspect-query', id?, els? }        request rects for `[data-el]` names
 *
 *   app → host
 *     { type: 'eazo-preview-inspect-ready', viewport }         sent once on arm
 *     { type: 'eazo-preview-inspect-result', id, els, viewport }  els: { name: rect + text }
 *
 * Behavior: renders null, self-disables outside an iframe, and stays
 * inert (no responses) until an explicit arm message arrives.
 */

const PROTOCOL_PREFIX = 'eazo-preview-inspect';

type InspectorMessage = {
  type: string;
  id?: string;
  els?: string[];
};

type ElSnapshot = { x: number; y: number; width: number; height: number; top: number; left: number; text: string };

export function PreviewInspector() {
  useEffect(() => {
    const frame = globalThis.window;
    if (!frame || frame.self === frame.top) return; // iframe previews only
    let armed = false;

    const respond = (payload: unknown) => frame.parent?.postMessage(payload, '*');

    const snapshot = (name: string): ElSnapshot | null => {
      const el = document.querySelector<HTMLElement>(`[data-el="${name}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        top: rect.top, left: rect.left,
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
      };
    };

    const collect = (requested?: string[]) => {
      const names = requested?.length
        ? requested
        : Array.from(document.querySelectorAll('[data-el]')).map((el) => el.getAttribute('data-el')!).filter(Boolean);
      const els: Record<string, ElSnapshot> = {};
      for (const name of names) {
        const item = snapshot(name);
        if (item) els[name] = item;
      }
      return els;
    };

    const viewport = () => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      scrollY: frame.scrollY,
    });

    const onMessage = (event: MessageEvent<InspectorMessage>) => {
      const message = event.data;
      if (!message || typeof message.type !== 'string' || !message.type.startsWith(PROTOCOL_PREFIX)) return;
      if (message.type === `${PROTOCOL_PREFIX}-arm`) {
        armed = true;
        respond({ type: `${PROTOCOL_PREFIX}-ready`, viewport: viewport() });
        return;
      }
      if (!armed) return;
      if (message.type === `${PROTOCOL_PREFIX}-query`) {
        respond({
          type: `${PROTOCOL_PREFIX}-result`,
          id: message.id,
          els: collect(message.els),
          viewport: viewport(),
        });
      }
    };

    frame.addEventListener('message', onMessage);
    return () => frame.removeEventListener('message', onMessage);
  }, []);

  return null;
}
