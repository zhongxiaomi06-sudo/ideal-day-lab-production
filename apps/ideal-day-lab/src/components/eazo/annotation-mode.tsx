import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';

/**
 * Annotation mode — creator dev tool for flagging design changes.
 *
 * Activation (either one):
 *   • URL contains `?annotate=1`           (recommended: preview + ?annotate=1)
 *   • host sends `eazo-preview-inspect-arm`
 *
 * While capturing, a document-level capture-phase click handler converts any
 * tap into a numbered annotation (the app never receives the click), so normal
 * scrolling, zooming and the rest of the page keep working. Notes persist in
 * localStorage under `ideal-day-lab.annotations.v1` and can be copied as a
 * markdown list — paste them into the creator chat and the agent applies them.
 *
 * The component renders nothing unless activated, so it never ships to
 * production users.
 */

const STORAGE_KEY = 'ideal-day-lab.annotations.v1';
const ARM_TYPE = 'eazo-preview-inspect-arm';

type Rect = { x: number; y: number; width: number; height: number };
type Annotation = {
  id: string;
  el: string;       // nearest [data-el] ancestor name, '' if none
  selector: string; // css path
  snippet: string;  // element text preview
  note: string;
  rect: Rect;       // rect captured at creation time
  at: number;
};

const isAnnotateUrl = () => {
  try { return new URLSearchParams(globalThis.location?.search ?? '').has('annotate'); } catch { return false; }
};

/** Short, stable CSS path (≤ limit segments), id-first. */
function cssPath(node: Element | null, limit = 5): string {
  if (!node || node.nodeType !== 1) return '';
  const parts: string[] = [];
  let el: Element | null = node;
  while (el && el.nodeType === 1 && parts.length < limit) {
    let part = el.tagName.toLowerCase();
    if (el.id) {
      part = `#${CSS.escape(el.id)}`;
    } else if (el.classList.length) {
      part += `.${Array.from(el.classList).slice(0, 3).map((c) => CSS.escape(c)).join('.')}`;
    }
    const parent: Element | null = el.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter((s) => s.tagName === el!.tagName);
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(el) + 1})`;
    }
    parts.unshift(part);
    el = parent;
  }
  return parts.join(' > ');
}

function nearestDataEl(node: Element | null): string {
  let el: Element | null = node;
  while (el && el.nodeType === 1) {
    const name = el.getAttribute('data-el');
    if (name) return name;
    el = el.parentElement;
  }
  return '';
}

export function AnnotationMode() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(isAnnotateUrl);
  const [capturing, setCapturing] = useState(true);
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<string | null>(null);
  const [hover, setHover] = useState<Rect | null>(null);
  const [tick, setTick] = useState(0);
  const notesRef = useRef<Annotation[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);

  /* ── activation: URL flag or host arm message ─────────────────────── */
  useEffect(() => {
    if (isAnnotateUrl()) return;
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === ARM_TYPE) setEnabled(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /* ── hydrate from storage once activated ──────────────────────────── */
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { notes?: Annotation[] };
        if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
      }
    } catch {
      /* storage unavailable — start empty */
    }
    setHydrated(true);
  }, [enabled]);

  /* ── persist every change (never before hydration) ────────────────── */
  useEffect(() => {
    if (!enabled || !hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, notes }));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [enabled, hydrated, notes]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  /* ── click capture: any tap becomes an annotation ─────────────────── */
  useEffect(() => {
    if (!enabled || !capturing) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || target.closest('.ann-root')) return; // our own UI
      event.preventDefault();
      event.stopPropagation();
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      if (!el || el.closest('.ann-root')) return;
      const selector = cssPath(el);
      const existing = notesRef.current.find((n) => n.selector === selector);
      if (existing) { setEditingId(existing.id); setDraft(existing.note); return; }
      const rect = el.getBoundingClientRect();
      const note: Annotation = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        el: nearestDataEl(el),
        selector,
        snippet: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
        note: '',
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        at: Date.now(),
      };
      setNotes((items) => [...items, note]);
      setEditingId(note.id);
      setDraft('');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, capturing]);

  /* ── hover highlight (fine pointers only) ─────────────────────────── */
  useEffect(() => {
    if (!enabled || !capturing) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      if (!el || el.closest('.ann-root')) { setHover(null); return; }
      const rect = el.getBoundingClientRect();
      setHover({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [enabled, capturing]);

  /* ── keep badges pinned to their elements on scroll / resize ──────── */
  useEffect(() => {
    if (!enabled) return;
    const bump = () => setTick((n) => n + 1);
    window.addEventListener('scroll', bump, { capture: true, passive: true });
    window.addEventListener('resize', bump);
    return () => {
      window.removeEventListener('scroll', bump, { capture: true });
      window.removeEventListener('resize', bump);
    };
  }, [enabled]);

  const liveRects = useMemo(() => notes.map((n) => {
    try {
      const el = document.querySelector<HTMLElement>(n.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
    } catch {
      /* stale selector — fall back to captured rect */
    }
    return n.rect;
  }), [notes, tick]);

  /* ── actions ──────────────────────────────────────────────────────── */
  const saveDraft = () => {
    if (!editingId) return;
    setNotes((items) => items.map((n) => (n.id === editingId ? { ...n, note: draft.trim() } : n)));
    setEditingId(null);
  };

  const deleteNote = (id: string) => {
    setNotes((items) => items.filter((n) => n.id !== id));
    setEditingId(null);
  };

  const openNote = (note: Annotation) => {
    setEditingId(note.id);
    setDraft(note.note);
  };

  const copyNotes = async () => {
    const lines = notes.map((n, i) => `${String(i + 1).padStart(2, '0')} [${n.el || 'page'}] ${n.note || '(no text)'}\n   → ${n.selector}`);
    const text = `${t('annotate.copyTitle', { n: notes.length })}\n\n${lines.join('\n\n')}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = false;
    }
    if (ok) {
      setToast(t('annotate.copied'));
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 2400);
    } else {
      setCopyFallback(text);
    }
  };

  const clearAll = () => {
    setNotes([]);
    setConfirmClear(false);
    setEditingId(null);
  };

  if (!enabled) return null;
  const editing = editingId ? notes.find((n) => n.id === editingId) : undefined;
  const editingIndex = editing ? notes.findIndex((n) => n.id === editing.id) : -1;

  return (
    <div className="ann-root" data-ann-root={capturing ? 'capture' : 'off'}>
      {capturing && (
        <>
          <div className="ann-hint" data-ann-hint>{t('annotate.hint')}</div>
          {hover && <div className="ann-highlight" style={{ left: hover.x, top: hover.y, width: hover.width, height: hover.height }} aria-hidden="true" />}
        </>
      )}
      {capturing && notes.map((note, index) => {
        const r = liveRects[index] ?? note.rect;
        const left = Math.min(r.x + index * 16, window.innerWidth - 30);
        const top = Math.min(r.y + index * 16, window.innerHeight - 34);
        return (
          <button
            key={note.id}
            type="button"
            className="ann-badge"
            data-ann-badge
            aria-label={`${index + 1}. ${note.note || t('annotate.empty')}`}
            style={{ left, top }}
            onClick={() => openNote(note)}
          >
            {index + 1}
          </button>
        );
      })}

      <div className="ann-toolbar" role="toolbar" aria-label={t('annotate.title')}>
        <button
          type="button"
          className="ann-toggle"
          data-ann-toggle
          aria-pressed={capturing}
          onClick={() => setCapturing((v) => !v)}
        >
          <span className="ann-dot" aria-hidden="true" />
          {capturing ? t('annotate.on') : t('annotate.off')}
        </button>
        <span className="ann-count" data-ann-count>{t('annotate.count', { n: notes.length })}</span>
        <button type="button" data-ann-copy onClick={() => void copyNotes()} disabled={notes.length === 0}>{t('annotate.copy')}</button>
        <button type="button" data-ann-clear onClick={() => setConfirmClear(true)} disabled={notes.length === 0}>{t('annotate.clear')}</button>
      </div>

      {toast && <div className="ann-toast" data-ann-toast role="status">{toast}</div>}

      {copyFallback !== null && (
        <div className="ann-modal" data-ann-copy-modal>
          <div>
            <p>{t('annotate.copyFailed')}</p>
            <textarea readOnly value={copyFallback} onFocus={(event) => event.currentTarget.select()} />
            <button data-ann-close onClick={() => setCopyFallback(null)}>{t('annotate.close')}</button>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="ann-modal" data-ann-clear-modal>
          <div>
            <p>{t('annotate.clearConfirm', { n: notes.length })}</p>
            <button className="ann-danger" data-ann-clear-ok onClick={clearAll}>{t('annotate.confirm')}</button>
            <button data-ann-cancel onClick={() => setConfirmClear(false)}>{t('annotate.cancel')}</button>
          </div>
        </div>
      )}

      {editing && (
        <div className="ann-sheet" data-ann-sheet>
          <div className="ann-sheet-head">
            <b>{t('annotate.editing', { n: editingIndex + 1 })}</b>
            {editing.el && <span className="ann-el">{editing.el}</span>}
          </div>
          <p className="ann-selector">{editing.selector}</p>
          {editing.snippet && <p className="ann-snippet">“{editing.snippet}”</p>}
          <textarea
            data-ann-input
            autoFocus
            rows={3}
            maxLength={500}
            placeholder={t('annotate.placeholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="ann-sheet-actions">
            <button type="button" className="ann-danger" data-ann-delete onClick={() => deleteNote(editing.id)}>{t('annotate.delete')}</button>
            <button type="button" data-ann-save onClick={saveDraft}>{t('annotate.save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
