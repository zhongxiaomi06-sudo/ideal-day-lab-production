import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { TimeBlock, Plan, SbtiPersonality } from './domain';
import {
  DAY_MINUTES, categories, comparisons, deleteAsOpenTime, deleteBlock as removeBlock, analyzeSBTI, averagePlan,
  formatTime, minutesOf, resizeSharedBoundary, samplePlan, sanitizeForShare, splitBlock,
} from './domain';
import { listPlans, removePlan, savePlan, setStorageMode, syncLocalToRemote } from './repository';
import { ProductionEazoAdapter } from './eazo';
import { useI18n } from './i18n';
import type { TranslationKey, TranslationVars } from './locales';
import { useEazo } from '@eazo/sdk/react';
import { auth } from '@eazo/sdk';
import { sound } from './sound';

type View = 'compose' | 'edit' | 'discover' | 'library';
type PersonaView = 'current' | 'history';
type Notice = { key: TranslationKey; vars?: TranslationVars } | null;

const host = new ProductionEazoAdapter();

const downloadJson = (name: string, value: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

/* ── tiny linear SVG icons (24px stroke set) ─────────────────────── */

const iconProps = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};
const IconUndo = () => (<svg {...iconProps}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>);
const IconRedo = () => (<svg {...iconProps}><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>);
const IconMinus = () => (<svg {...iconProps}><path d="M5 12h14" /></svg>);
const IconPlus = () => (<svg {...iconProps}><path d="M12 5v14M5 12h14" /></svg>);
const IconSplit = () => (<svg {...iconProps}><path d="M12 3v7" /><path d="M12 10l-4.5 4.5" /><path d="M12 10l4.5 4.5" /><path d="M6 21h3" /><path d="M15 21h3" /></svg>);
const IconClose = () => (<svg {...iconProps}><path d="M6 6l12 12M18 6 6 18" /></svg>);
const IconTrash = () => (<svg {...iconProps}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9L17.5 7" /><path d="M10 11v6M14 11v6" /></svg>);
const IconArrow = () => (<svg {...iconProps}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>);
const IconClock = () => (<svg {...iconProps}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>);
const IconOpen = () => (<svg {...iconProps}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>);
const IconOverlap = () => (<svg {...iconProps}><rect x="6.5" y="6.5" width="11" height="11" /><rect x="9.5" y="9.5" width="11" height="11" opacity=".55" /></svg>);
const IconCheck = () => (<svg {...iconProps}><path d="M4.5 12.5l5 5L19.5 6.5" /></svg>);
const IconWarn = () => (<svg {...iconProps}><path d="M12 4v10" /><path d="M12 18.5h.01" /></svg>);
const IconSoundOn = () => (<svg {...iconProps}><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></svg>);
const IconSoundOff = () => (<svg {...iconProps}><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" /><path d="M16 9l5 6M21 9l-5 6" /></svg>);
const IconUser = () => (<svg {...iconProps}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>);
const IconLock = () => (<svg {...iconProps}><rect x="5.5" y="10.5" width="13" height="9" rx="1" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>);
const IconUnlock = () => (<svg {...iconProps}><rect x="5.5" y="10.5" width="13" height="9" rx="1" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2" /></svg>);

/* ── signed-in account chip ──────────────────────────────────────── */

function AccountButton() {
  const { t } = useI18n();
  const user = useEazo((state) => state.auth.user);
  const loading = useEazo((state) => state.auth.loading);

  if (loading) return <span className="account-btn account-loading" aria-hidden="true" />;
  if (!user) {
    return (
      <button type="button" className="account-btn" aria-label={t('auth.signInAria')} title={t('auth.signInAria')} onClick={() => auth.showLogin()}>
        <IconUser /><span>{t('auth.signIn')}</span>
      </button>
    );
  }
  return (
    <div className="account-chip">
      {user.avatarUrl
        ? <img className="account-avatar" src={user.avatarUrl} alt="" />
        : <span className="account-avatar">{user.name?.slice(0, 1).toUpperCase() ?? 'U'}</span>}
      <span className="account-name">{user.name ?? user.email}</span>
      <button type="button" className="account-signout" aria-label={t('auth.signOut')} title={t('auth.signOut')} onClick={() => void auth.logout()}>×</button>
    </div>
  );
}

/* ── brand ────────────────────────────────────────────────────────── */

function Logo() {
  const { t } = useI18n();
  return (
    <div className="brand" aria-label="Ideal Day Lab">
      <span className="mark" aria-hidden="true">EA</span>
      <span><b>{t('brand.title')}</b><i>{t('brand.sub')}</i></span>
    </div>
  );
}

function Timeline({ blocks }: { blocks: TimeBlock[] }) {
  return (
    <div className="timeline-wrap">
      <div className="timeline" role="img" aria-label={blocks.map((block) => `${block.title}, ${minutesOf(block)} minutes`).join('. ')}>
        {blocks.map((block) => <div key={block.id} title={block.title} style={{ width: `${minutesOf(block) / 14.4}%`, background: categories[block.categoryId].color }} />)}
      </div>
      <div className="timeline-labels" aria-hidden="true"><span>12 AM</span><span>6</span><span>NOON</span><span>6</span><span>12 AM</span></div>
    </div>
  );
}

const durationText = (minutes: number, t: (key: TranslationKey, vars?: TranslationVars) => string) =>
  t('edit.duration', { h: Math.floor(minutes / 60), m: minutes % 60 });

type T = (key: TranslationKey, vars?: TranslationVars) => string;

function PersonaCard({ reading, t }: { reading: SbtiPersonality; t: T }) {
  return (
    <article className="persona" data-el="persona-card">
      <div className="persona-head">
        <div>
          <p className="kicker">{t('sbti.kicker')}</p>
          <h2>{t('sbti.title')}</h2>
        </div>
        <div className="persona-type" aria-label={`${reading.code} · ${t(`sbti.person.${reading.code}` as TranslationKey)}`}>
          <strong>{reading.code}</strong>
          <span>{t(`sbti.person.${reading.code}` as TranslationKey)}</span>
        </div>
      </div>
      <p className="persona-trait">{t(`sbti.tag.${reading.code}` as TranslationKey)}</p>
      <h3 className="persona-axes-title">{t('sbti.axesTitle')}</h3>
      <div className="persona-axes">
        {reading.axes.map((axis) => (
          <div key={axis.id} className="persona-axis">
            <div className="persona-axis-meta">
              <b>{t(`sbti.axis.${axis.id}` as TranslationKey)}</b>
              <span>{t(axis.leftKey)} {Math.round(axis.leftPct)}% · {t(axis.rightKey)} {100 - Math.round(axis.leftPct)}%</span>
            </div>
            <div className="persona-bar" role="img" aria-label={`${t(`sbti.axis.${axis.id}` as TranslationKey)}: ${t(axis.leftKey)} ${Math.round(axis.leftPct)}% / ${t(axis.rightKey)} ${100 - Math.round(axis.leftPct)}%`}>
              <i style={{ width: `${axis.leftPct}%` }} className={axis.winner === axis.leftKey ? 'win' : ''} />
              <em style={{ width: `${100 - axis.leftPct}%` }} className={axis.winner === axis.rightKey ? 'win' : ''} />
            </div>
          </div>
        ))}
      </div>
      <div className="persona-stats">
        <div className="pstat"><i className="pstat-ring" style={{ background: `conic-gradient(var(--ink) ${Math.round(reading.sleepMin / DAY_MINUTES * 100)}%, var(--line) 0)` }}><b>{Math.round(reading.sleepMin / 60)}<small>h</small></b></i><em>{t('sbti.statSleep')}</em></div>
        <div className="pstat"><i className="pstat-ring" style={{ background: `conic-gradient(var(--acid) ${Math.round(reading.createMin / DAY_MINUTES * 100)}%, var(--line) 0)` }}><b>{Math.round(reading.createMin / 60)}<small>h</small></b></i><em>{t('sbti.statCreate')}</em></div>
        <div className="pstat"><i className="pstat-ring" style={{ background: `conic-gradient(#d8b800 ${Math.round(reading.socialMin / DAY_MINUTES * 100)}%, var(--line) 0)` }}><b>{Math.round(reading.socialMin / 60)}<small>h</small></b></i><em>{t('sbti.statSocial')}</em></div>
        <div className="pstat"><i className="pstat-ring" style={{ background: `conic-gradient(#0090d8 ${Math.round(reading.openMin / DAY_MINUTES * 100)}%, var(--line) 0)` }}><b>{Math.round(reading.openMin / 60)}<small>h</small></b></i><em>{t('sbti.statOpen')}</em></div>
      </div>
      <p className="persona-caveat">{t('sbti.caveat')}</p>
    </article>
  );
}

export function App() {
  const { locale, t } = useI18n();
  const [view, setView] = useState<View>('compose');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [snap, setSnap] = useState(5);
  const [notice, setNotice] = useState<Notice>({ key: 'notice.ready' });
  const [history, setHistory] = useState<TimeBlock[][]>([]);
  const [future, setFuture] = useState<TimeBlock[][]>([]);
  const [lastDeleted, setLastDeleted] = useState<Plan | null>(null);
  const [posDrag, setPosDrag] = useState<{ id: string; from: TimeBlock[]; offset: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [durMin, setDurMin] = useState(60);
  const pressRef = useRef<{ timer: number; interval: number; alive: { value: boolean }; from: TimeBlock[] } | null>(null);
  const [soundOn, setSoundOn] = useState(!sound.muted);
  const [personaView, setPersonaView] = useState<PersonaView>('current');
  const authUser = useEazo((state) => state.auth.user);
  const authLoading = useEazo((state) => state.auth.loading);

  // Sign-in sync: push local plans to the account, then read/write remotely.
  // Sign-out: drop back to the local store.
  useEffect(() => {
    if (authLoading) return;
    if (authUser) {
      setStorageMode('remote');
      void syncLocalToRemote()
        .then(() => listPlans())
        .then(setSavedPlans)
        .catch(() => setNotice({ key: 'notice.libraryUnavailable' }));
    } else {
      setStorageMode('local');
      void listPlans().then(setSavedPlans).catch(() => setNotice({ key: 'notice.libraryUnavailable' }));
    }
  }, [authUser, authLoading]);

  useEffect(() => { void listPlans().then(setSavedPlans).catch(() => setNotice({ key: 'notice.libraryUnavailable' })); }, []);
  useEffect(() => { host.requestResize(document.documentElement.scrollHeight); }, [view, plan]);
  // The day bar fits the whole editor on one screen: drop the visible
  // scrollbar indicator while editing (scrolling itself still works).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('hide-scrollbar', view === 'edit');
    return () => root.classList.remove('hide-scrollbar');
  }, [view]);

  const total = useMemo(() => plan?.blocks.reduce((sum, block) => sum + minutesOf(block), 0) ?? 0, [plan]);
  const openMinutes = useMemo(() => plan?.blocks.filter((block) => block.categoryId === 'unallocated').reduce((sum, block) => sum + minutesOf(block), 0) ?? 0, [plan]);
  const insights = useMemo(() => plan ? comparisons(plan, locale).slice(0, 5) : [], [plan, locale]);
  const personality = useMemo(() => plan ? analyzeSBTI(plan) : null, [plan]);
  const historyPlan = useMemo(() => savedPlans.length > 0 ? averagePlan(savedPlans) : null, [savedPlans]);
  const historyPersonality = useMemo(() => historyPlan ? analyzeSBTI(historyPlan) : null, [historyPlan]);
  const historyInsights = useMemo(() => historyPlan ? comparisons(historyPlan, locale).slice(0, 5) : [], [historyPlan, locale]);
  const conserved = total === DAY_MINUTES;
  // The day is time-conserved by design; "writing the day" means leaving no
  // open (unallocated) minutes — that is when the portrait unlocks.
  const unlocked = conserved && openMinutes === 0;

  const createSample = () => {
    const next = samplePlan(locale);
    setPlan(next);
    setHistory([]);
    setFuture([]);
    setNotice({ key: 'notice.sampleReady' });
    return next;
  };

  const startDay = () => {
    createSample();
    setView('edit');
    sound.play('enter');
  };

  const commit = (blocks: TimeBlock[], message: Notice) => {
    if (!plan) return;
    setHistory((items) => [...items.slice(-49), plan.blocks]);
    setFuture([]);
    setPlan({ ...plan, blocks, updatedAt: new Date().toISOString() });
    setNotice(message);
  };

  // Hold-to-repeat stepper: every step updates the plan live, and the whole
  // press collapses into a single undo entry (same pattern as the drag strip).
  // The tick sound is decided outside the updater: React batches queued
  // functional updates into one render pass, so playing inside the updater
  // would collapse several fast steps into a single tick.
  const planRef = useRef<Plan | null>(null);
  planRef.current = plan;
  const draftAdjust = (index: number, delta: number) => {
    const current = planRef.current;
    if (!current) return;
    const block = current.blocks[index];
    if (!block) return;
    const result = resizeSharedBoundary(current.blocks, index, block.endMin + delta, snap);
    if (!result.ok) return;
    sound.play('step');
    setPlan((latest) => {
      if (!latest) return latest;
      const lb = latest.blocks[index];
      if (!lb) return latest;
      const lr = resizeSharedBoundary(latest.blocks, index, lb.endMin + delta, snap);
      if (!lr.ok) return latest;
      return { ...latest, blocks: lr.blocks, updatedAt: new Date().toISOString() };
    });
  };

  const onStepDown = (event: ReactPointerEvent<HTMLButtonElement>, index: number, dir: 1 | -1) => {
    if (event.button !== 0 || !plan) return;
    const block = plan.blocks[index];
    if (!block) return;
    const dur = minutesOf(block);
    const isLast = index === plan.blocks.length - 1;
    if (isLast || (dir === -1 && dur <= snap)) return;
    event.preventDefault();
    setEditingId(null);
    draftAdjust(index, dir * snap);
    const alive = { value: true };
    const from = plan.blocks;
    const timer = window.setTimeout(() => {
      if (!alive.value) return;
      let delay = 90;
      const loop = () => {
        if (!alive.value) return;
        draftAdjust(index, dir * snap);
        delay = Math.max(45, Math.round(delay * 0.8));
        pressRef.current!.interval = window.setTimeout(loop, delay);
      };
      pressRef.current!.interval = window.setTimeout(loop, delay);
    }, 300);
    pressRef.current = { timer, interval: 0, alive, from };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* noop */ }
  };

  const onStepUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press) return;
    pressRef.current = null;
    press.alive.value = false;
    window.clearTimeout(press.timer);
    window.clearTimeout(press.interval);
    try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* noop */ }
    if (!plan) return;
    const changed = plan.blocks.some((block, i) => {
      const before = press.from[i];
      return !before || block.startMin !== before.startMin || block.endMin !== before.endMin;
    });
    if (!changed) return;
    setHistory((items) => [...items.slice(-49), press.from]);
    setFuture([]);
    setNotice({ key: 'notice.boundaryMoved', vars: { n: snap } });
  };

  const startEdit = (block: TimeBlock) => {
    setDurMin(minutesOf(block));
    setEditingId(block.id);
  };

  const applyExact = (id: string) => {
    if (!plan) return;
    const index = plan.blocks.findIndex((item) => item.id === id);
    if (index < 0) return;
    const block = plan.blocks[index];
    if (!block) return;
    const target = Math.min(Math.max(Math.round((durMin || 0) / snap) * snap, snap), DAY_MINUTES - snap);
    const delta = target - minutesOf(block);
    setEditingId(null);
    if (delta === 0) return;
    // Grow: borrow from the next block first, then the previous one.
    // Shrink: hand the surplus to the next block, or the previous one when last.
    let result = resizeSharedBoundary(plan.blocks, index, block.endMin + delta, snap);
    if (!result.ok && index > 0) result = resizeSharedBoundary(plan.blocks, index - 1, block.startMin - delta, snap);
    if (!result.ok) { sound.play('warn'); setNotice({ key: 'notice.overlap' }); return; }
    commit(result.blocks, { key: 'notice.boundaryMoved', vars: { n: Math.abs(delta) } });
    sound.play('apply');
  };

  const updateBlock = (id: string, patch: Partial<TimeBlock>) => {
    if (!plan) return;
    commit(plan.blocks.map((block) => block.id === id ? { ...block, ...patch } : block), { key: 'notice.blockUpdated' });
  };

  const split = (id: string) => {
    if (!plan) return;
    const result = splitBlock(plan.blocks, id, snap);
    if (!result.ok) {
      sound.play('warn');
      setNotice(result.code === 'TOO_MANY_BLOCKS' ? { key: 'notice.tooManyBlocks' } : { key: 'notice.tooShort' });
      return;
    }
    commit(result.blocks, { key: 'notice.splitDone' });
    sound.play('split');
  };

  const moveBlockTo = (id: string, next: number) => {
    if (!plan) return;
    commit(plan.blocks.map((block) => {
      if (block.id !== id) return block;
      const dur = block.endMin - block.startMin;
      return { ...block, startMin: next, endMin: next + dur };
    }), { key: 'notice.blockUpdated' });
  };

  const onPosDown = (event: ReactPointerEvent<HTMLElement>, block: TimeBlock) => {
    if (!plan || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPosDrag({ id: block.id, from: plan.blocks, offset: event.clientX - rect.left });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPosMove = (event: ReactPointerEvent<HTMLElement>, block: TimeBlock) => {
    if (!posDrag || posDrag.id !== block.id || !plan) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const dur = block.endMin - block.startMin;
    const raw = ((event.clientX - posDrag.offset - rect.left) / rect.width) * DAY_MINUTES;
    const snapped = Math.round(raw / snap) * snap;
    const next = Math.min(Math.max(0, snapped), DAY_MINUTES - dur);
    if (next === block.startMin) return;
    sound.play('step');
    setPlan((current) => current && {
      ...current,
      blocks: current.blocks.map((item) => item.id === block.id ? { ...item, startMin: next, endMin: next + dur } : item),
    });
  };

  const onPosUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (!posDrag || !plan) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const changed = plan.blocks.some((block, index) => block.startMin !== posDrag.from[index]?.startMin);
    setPosDrag(null);
    if (!changed) return;
    setHistory((items) => [...items.slice(-49), posDrag.from]);
    setFuture([]);
    setNotice({ key: 'notice.blockUpdated' });
  };

  const onPosKey = (event: ReactKeyboardEvent<HTMLElement>, block: TimeBlock) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!plan) return;
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    const dur = block.endMin - block.startMin;
    const next = Math.min(Math.max(0, block.startMin + dir * snap), DAY_MINUTES - dur);
    if (next === block.startMin) return;
    moveBlockTo(block.id, next);
    sound.play('step');
  };

  const openBlock = (id: string) => {
    if (!plan) return;
    const block = plan.blocks.find((item) => item.id === id);
    commit(deleteAsOpenTime(plan.blocks, id, locale), { key: 'notice.openTime', vars: { title: block?.title ?? '' } });
    sound.play('apply');
  };

  const onDeleteBlock = (id: string) => {
    if (!plan) return;
    const block = plan.blocks.find((item) => item.id === id);
    const result = removeBlock(plan.blocks, id);
    if (!result.ok) return;
    commit(result.blocks, { key: 'notice.deleted', vars: { title: block?.title ?? '' } });
    sound.play('delete');
  };

  const undo = () => {
    if (!plan || !history.length) return;
    const previous = history.at(-1)!;
    setFuture((items) => [plan.blocks, ...items].slice(0, 50));
    setHistory((items) => items.slice(0, -1));
    setPlan({ ...plan, blocks: previous, updatedAt: new Date().toISOString() });
    setNotice({ key: 'notice.undo' });
    sound.play('undo');
  };

  const redo = () => {
    if (!plan || !future.length) return;
    const next = future[0]!;
    setHistory((items) => [...items, plan.blocks].slice(-50));
    setFuture((items) => items.slice(1));
    setPlan({ ...plan, blocks: next, updatedAt: new Date().toISOString() });
    setNotice({ key: 'notice.redo' });
    sound.play('redo');
  };

  const save = async () => {
    if (!plan) return;
    const result = await savePlan(plan);
    if (!result.ok) { sound.play('warn'); setNotice({ key: 'notice.libraryFull' }); setView('library'); return; }
    setSavedPlans(await listPlans());
    setNotice({ key: 'notice.saved' });
    sound.play('success');
  };

  const sharePlan = async () => {
    if (!plan) return;
    const publicData = sanitizeForShare(plan);
    const result = await host.share({ appId: 'ideal-day-lab', schemaVersion: 2, publicData: publicData as unknown as Record<string, unknown> });
    if (result.ok) { setNotice({ key: 'notice.shared' }); sound.play('success'); }
    else {
      downloadJson('my-ideal-day.private-safe.json', publicData);
      setNotice({ key: 'notice.shareFallback' });
      sound.play('apply');
    }
  };

  const duplicate = async (item: Plan) => {
    const copy = { ...item, planId: crypto.randomUUID(), title: `${item.title} — ${t('library.remix')}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const result = await savePlan(copy);
    if (!result.ok) { setNotice({ key: 'notice.remixFull' }); return; }
    setSavedPlans(await listPlans());
    setNotice({ key: 'notice.remixed' });
  };

  const goto = (target: View) => {
    if ((target === 'edit' || target === 'discover') && !plan) {
      createSample();
      setView(target);
      return;
    }
    setView(target);
  };

  const openSaved = (item: Plan) => {
    setPlan(item);
    setHistory([]);
    setFuture([]);
    setView('edit');
    setNotice({ key: 'notice.openedPlan' });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">{t('nav.skip')}</a>
      <header className="topbar">
        <Logo />
        <div className="topbar-right">
          <AccountButton />
          <button
            className="sound-btn"
            aria-label={soundOn ? t('sound.offAria') : t('sound.onAria')}
            aria-pressed={soundOn}
            title={soundOn ? t('sound.offAria') : t('sound.onAria')}
            onClick={() => setSoundOn(!sound.toggle())}
          >
            {soundOn ? <IconSoundOn /> : <IconSoundOff />}
          </button>
        </div>
      </header>

      <nav className="nav-pill" aria-label={t('nav.main')} data-el="main-nav">
        <button aria-label={t('nav.startAria')} className={view === 'compose' ? 'active' : ''} onClick={() => goto('compose')}><span className="nav-glyph" aria-hidden="true">✦</span><span className="nav-label">{t('nav.start')}</span></button>
        <button aria-label={t('nav.dayAria')} className={view === 'edit' ? 'active' : ''} onClick={() => goto('edit')}><span className="nav-glyph" aria-hidden="true">◴</span><span className="nav-label">{t('nav.day')}</span></button>
        <button aria-label={t('nav.libraryAria', { n: savedPlans.length })} className={view === 'library' ? 'active' : ''} onClick={() => goto('library')}><span className="nav-glyph" aria-hidden="true">▣</span><span className="nav-label">{t('nav.library')}</span>{savedPlans.length > 0 && <span className="nav-count">{savedPlans.length}</span>}</button>
      </nav>

      <main id="main" tabIndex={-1}>
        <p className="live-region" role="status" aria-live="polite">{notice ? t(notice.key, notice.vars) : ''}</p>

        <div className="view" key={view}>
        {view === 'compose' && (
          <section
            className="hero"
            data-el="landing-enter"
            role="button"
            tabIndex={0}
            aria-label={t('compose.start')}
            onClick={startDay}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startDay(); }
            }}
          >
            <div className="clock-art" aria-hidden="true"><i className="hand" /><i className="hub">24H</i></div>
            <h1>{t('compose.heroTitle')}</h1>
            <div className="tap-dots" aria-hidden="true"><i /><i /><i /></div>
          </section>
        )}

        {view === 'edit' && plan && (
          <section className="ed-workspace" data-el="day-editor">
            <div className="ed-head">
              <div className="ed-title">
                <p className="kicker">{t('edit.kicker')}</p>
                <input className="ed-title-input" aria-label={t('edit.titleAria')} value={plan.title} maxLength={80} onChange={(event) => setPlan({ ...plan, title: event.target.value })} />
              </div>
              <div className="ed-tools">
                <button className="ed-icon-btn" aria-label={t('edit.undo')} disabled={!history.length} onClick={undo}><IconUndo /></button>
                <button className="ed-icon-btn" aria-label={t('edit.redo')} disabled={!future.length} onClick={redo}><IconRedo /></button>
                <button className="ed-save" onClick={() => void save()}>{t('edit.save')}</button>
                <button className="ed-persona" aria-label={unlocked ? t('edit.personaAria') : t('edit.personaLock')} disabled={!unlocked} onClick={() => { setPersonaView('current'); setView('discover'); sound.play('success'); }}>{unlocked ? <IconUnlock /> : <IconLock />}{unlocked ? t('edit.personaBtn') : t('edit.personaLockShort')}</button>
              </div>
            </div>

            <div className={`ed-dash ${conserved ? 'ok' : total > DAY_MINUTES ? 'over' : 'warn'}`}>
              <div className="ed-dash-main">
                <span className="ed-dash-label">{t('edit.dashLabel')}</span>
                <strong>{durationText(total, t)}</strong>
                <div className="ed-progress" role="img" aria-label={t('edit.statusOk')}><i style={{ width: `${Math.min(100, total / DAY_MINUTES * 100)}%` }} /></div>
              </div>
              <div className="ed-dash-stats">
                <div><IconClock /><span>{t('edit.scheduled')}</span><strong>{durationText(total, t)}</strong></div>
                <div><IconOpen /><span>{t('edit.open')}</span><strong>{durationText(openMinutes, t)}</strong></div>
                <div><IconOverlap /><span>{t('edit.overlap')}</span><strong>0</strong></div>
                <div className={conserved ? 'ok' : ''}>{conserved ? <IconCheck /> : <IconWarn />}<span>{t('edit.status')}</span><strong>{conserved ? t('edit.statusOk') : t('edit.statusFix')}</strong></div>
              </div>
            </div>

            <div className="ed-toolbar">
              <h2>{t('edit.heading')}</h2>
              <label>{t('edit.snap')}<select value={snap} onChange={(event) => setSnap(Number(event.target.value))}>
                <option value="1">{t('edit.snap1')}</option>
                <option value="5">{t('edit.snap5')}</option>
                <option value="15">{t('edit.snap15')}</option>
                <option value="30">{t('edit.snap30')}</option>
              </select></label>
            </div>

            <div className="ed-list" data-el="day-sliders">
              {plan.blocks.map((block, index) => {
                const isLast = index === plan.blocks.length - 1;
                const dur = minutesOf(block);
                return (
                  <article key={block.id} className="ed-card">
                    <div className="ed-card-main">
                      <span className="ed-idx" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span className="ed-stripe" style={{ background: categories[block.categoryId].color }} aria-hidden="true" />
                      <input className="ed-card-title" aria-label={`${index + 1}. ${t('edit.titleAria')}`} value={block.title} maxLength={80} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
                    </div>
                    <div className="ed-card-meta">
                      <span className="ed-chip">
                        <i style={{ background: categories[block.categoryId].color }} aria-hidden="true" />
                        <select aria-label={`${block.title} · ${t('nav.day')}`} value={block.categoryId} onChange={(event) => updateBlock(block.id, { categoryId: event.target.value as TimeBlock['categoryId'] })}>
                          {Object.entries(categories).map(([id]) => <option key={id} value={id}>{t(`cat.${id}` as TranslationKey)}</option>)}
                        </select>
                      </span>
                      <span className="ed-time">{formatTime(block.startMin)}–{formatTime(block.endMin)}</span>
                    </div>
                    <div className="ed-time-row">
                      <button className="ed-stepper" aria-label={t('edit.shortenAria', { title: block.title, n: snap })} disabled={isLast || dur <= snap}
                        onPointerDown={(event) => onStepDown(event, index, -1)} onPointerUp={onStepUp} onPointerCancel={onStepUp}><IconMinus /></button>
                      {editingId === block.id ? (
                        <div className="ed-dur-edit">
                          <input type="number" inputMode="numeric" autoFocus min={snap} max={DAY_MINUTES - snap} step={snap}
                            aria-label={t('edit.durAria', { title: block.title })} value={durMin}
                            onChange={(event) => setDurMin(Math.max(0, Number(event.target.value) || 0))}
                            onKeyDown={(event) => { if (event.key === 'Enter') applyExact(block.id); if (event.key === 'Escape') { setEditingId(null); sound.play('cancel'); } }} />
                          <i>{t('edit.durUnit')}</i>
                          <button className="ed-dur-apply" onClick={() => applyExact(block.id)}>{t('edit.durApply')}</button>
                          <button className="ed-dur-cancel" onClick={() => { setEditingId(null); sound.play('cancel'); }}>{t('edit.durCancel')}</button>
                        </div>
                      ) : (
                        <button type="button" className="ed-time-big" aria-label={t('edit.durAria', { title: block.title })} title={t('edit.durAria', { title: block.title })} onClick={() => startEdit(block)}>
                          <strong>{formatTime(block.startMin)}–{formatTime(block.endMin)}</strong>
                          <span>{durationText(dur, t)}</span>
                        </button>
                      )}
                      <button className="ed-stepper" aria-label={t('edit.extendAria', { title: block.title, n: snap })} disabled={isLast}
                        onPointerDown={(event) => onStepDown(event, index, 1)} onPointerUp={onStepUp} onPointerCancel={onStepUp}><IconPlus /></button>
                    </div>
                    <div
                      className="ed-card-pos"
                      role="slider"
                      tabIndex={0}
                      aria-label={t('edit.posAria', { title: block.title, start: formatTime(block.startMin), end: formatTime(block.endMin) })}
                      aria-valuemin={0}
                      aria-valuemax={DAY_MINUTES}
                      aria-valuenow={block.startMin}
                      aria-valuetext={`${formatTime(block.startMin)}–${formatTime(block.endMin)}`}
                      onPointerDown={(event) => onPosDown(event, block)}
                      onPointerMove={(event) => onPosMove(event, block)}
                      onPointerUp={onPosUp}
                      onPointerCancel={onPosUp}
                      onKeyDown={(event) => onPosKey(event, block)}
                    >
                      <i className="ed-card-pos-fill" style={{ left: `${block.startMin / DAY_MINUTES * 100}%`, width: `${dur / DAY_MINUTES * 100}%` }} aria-hidden="true" />
                      <i className="ed-card-pos-knob" style={{ left: `${block.startMin / DAY_MINUTES * 100}%` }} aria-hidden="true" />
                    </div>
                    <div className="ed-card-actions">
                      <button aria-label={t('edit.splitAria', { title: block.title })} disabled={dur < 2 || plan.blocks.length >= 48} onClick={() => split(block.id)}><IconSplit /><span>{t('edit.splitBtn')}</span></button>
                      <button className="danger" aria-label={t('edit.openAria', { title: block.title })} onClick={() => openBlock(block.id)}><IconClose /><span>{t('edit.openBtn')}</span></button>
                      <button className="danger strong" aria-label={t('edit.deleteAria', { title: block.title })} disabled={plan.blocks.length <= 1} title={t('edit.deleteHint')} onClick={() => onDeleteBlock(block.id)}><IconTrash /><span>{t('edit.deleteBtn')}</span></button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="ed-cta">
              <div>
                <b>{t('edit.ctaTitle')}</b>
                <p>{unlocked ? t('edit.ctaSub') : t('edit.lockHint', { n: openMinutes })}</p>
              </div>
              <button className="ed-cta-btn" disabled={!unlocked} onClick={() => { setPersonaView('current'); setView('discover'); sound.play('success'); }}>{unlocked ? <IconUnlock /> : <IconLock />}{t('edit.cta')} {unlocked && <IconArrow />}</button>
            </div>
          </section>
        )}

        {view === 'discover' && plan && personality && (
          <section className="discover" data-el="scale-view">
            <div className="discover-nav">
              <button className="discover-back" onClick={() => { setView('edit'); sound.play('cancel'); }}><IconArrow /><span>{t('discover.back')}</span></button>
              <div className="discover-tabs" role="tablist" aria-label={t('discover.tabsAria')}>
                <button role="tab" aria-selected={personaView === 'current'} className={personaView === 'current' ? 'active' : ''} onClick={() => setPersonaView('current')}>{t('discover.tabCurrent')}</button>
                <button role="tab" aria-selected={personaView === 'history'} className={personaView === 'history' ? 'active' : ''} onClick={() => setPersonaView('history')}>{t('discover.tabHistory')}</button>
              </div>
            </div>

            {personaView === 'current' && (
              <>
                <div className="discover-hero">
                  <p className="kicker">{t('discover.kicker')}</p>
                  <h1>{t('discover.h1a')}<em>{t('discover.h1em')}</em></h1>
                  <div className="year-scale" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} className={i === 6 ? 'mark' : ''} />)}</div>
                </div>
                <PersonaCard reading={personality} t={t} />
                <div className="insight-grid">{insights.map((item, index) => <details key={item.id} open={index === 0}><summary><span>0{index + 1}</span><h2>{item.text}</h2><b>+</b></summary><p>{item.detail}</p></details>)}</div>
                <div className="share-panel"><div><p className="kicker">{t('discover.shareKicker')}</p><h2>{t('discover.shareTitle')}</h2></div><div><button className="build-button" onClick={() => void sharePlan()}>{t('discover.shareBtn')} <span>↗</span></button><button onClick={() => downloadJson('my-ideal-day.json', sanitizeForShare(plan))}>{t('discover.exportBtn')}</button></div></div>
              </>
            )}

            {personaView === 'history' && (
              <>
                <div className="discover-hero">
                  <p className="kicker">{historyPersonality ? t('discover.historyKicker', { n: savedPlans.length }) : t('discover.kicker')}</p>
                  <h1>{t('discover.historyH1')}</h1>
                  <p>{t('discover.historySub')}</p>
                </div>
                {historyPersonality ? (
                  <>
                    <PersonaCard reading={historyPersonality} t={t} />
                    <div className="insight-grid">{historyInsights.map((item, index) => <details key={item.id} open={index === 0}><summary><span>0{index + 1}</span><h2>{item.text}</h2><b>+</b></summary><p>{item.detail}</p></details>)}</div>
                  </>
                ) : (
                  <div className="empty history-empty">
                    <span>{t('discover.historyEmpty')}</span>
                    <h2>{t('discover.historyEmptyTitle')}</h2>
                    <button className="accent" onClick={() => { setPersonaView('current'); setView('edit'); }}>{t('discover.historyCta')}</button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {view === 'library' && (
          <section className="library" data-el="library-view">
            <div className="library-head"><div><p className="kicker">{t('library.kicker')}</p><h1>{t('library.title')}</h1></div>{lastDeleted && <button className="accent" onClick={() => void savePlan(lastDeleted).then(() => listPlans()).then(setSavedPlans).then(() => setLastDeleted(null))}>{t('library.restore')}</button>}</div>
            {savedPlans.length === 0 ? <div className="empty"><span>{t('library.emptyNo')}</span><h2>{t('library.emptyTitle')}</h2><button className="accent" onClick={() => setView('compose')}>{t('library.emptyCta')}</button></div> : <div className="plan-grid">{savedPlans.map((item) => {
              const d = new Date(item.updatedAt);
              const month = d.toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short' });
              const day = String(d.getDate()).padStart(2, '0');
              return <article key={item.planId}><div className="plan-poster" aria-hidden="true"><span className="plan-month">{month}</span><b className="plan-day">{day}</b><i className="plan-mark" /></div><h2>{item.title}</h2><Timeline blocks={item.blocks} /><div><button onClick={() => openSaved(item)}>{t('library.open')}</button><button onClick={() => void duplicate(item)}>{t('library.remix')}</button><button onClick={() => void removePlan(item.planId).then(() => { setLastDeleted(item); return listPlans(); }).then(setSavedPlans)}>{t('library.delete')}</button></div></article>;
            })}</div>}
          </section>
        )}
        </div>
      </main>
      <footer><Logo /><p>{t('footer.tagline')}</p><button onClick={() => { setPlan(null); setView('compose'); }}>{t('footer.reset')}</button></footer>
    </div>
  );
}
