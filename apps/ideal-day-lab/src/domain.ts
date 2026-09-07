import { fallbackTitles, translate, type Locale, type TranslationKey } from './locales';

export const DAY_MINUTES = 1_440;
export const MAX_PLANS = 20;
export const MAX_BLOCKS = 48;

/** A curated "starter" day the app builds instantly — no typing required. */
export function samplePlan(locale: Locale = 'en-US'): Plan {
  const parts: Array<{ minutes: number; categoryId: CategoryId; titleKey: TranslationKey }> = [
    { minutes: 400, categoryId: 'sleep', titleKey: 'sample.1' },
    { minutes: 30, categoryId: 'personal', titleKey: 'sample.2' },
    { minutes: 60, categoryId: 'food', titleKey: 'sample.3' },
    { minutes: 190, categoryId: 'work-study', titleKey: 'sample.4' },
    { minutes: 60, categoryId: 'exercise', titleKey: 'sample.5' },
    { minutes: 60, categoryId: 'social', titleKey: 'sample.6' },
    { minutes: 90, categoryId: 'work-study', titleKey: 'sample.7' },
    { minutes: 90, categoryId: 'personal', titleKey: 'sample.8' },
    { minutes: 60, categoryId: 'exercise', titleKey: 'sample.9' },
    { minutes: 60, categoryId: 'food', titleKey: 'sample.10' },
    { minutes: 110, categoryId: 'care', titleKey: 'sample.11' },
    { minutes: 90, categoryId: 'play', titleKey: 'sample.12' },
    { minutes: 60, categoryId: 'personal', titleKey: 'sample.13' },
    { minutes: 80, categoryId: 'play', titleKey: 'sample.14' },
  ];
  let cursor = 0;
  const blocks = parts.map((part) => {
    const block: TimeBlock = {
      id: uid(), title: translate(locale, part.titleKey), categoryId: part.categoryId,
      startMin: cursor, endMin: cursor + part.minutes, confidence: 1,
    };
    cursor += part.minutes;
    return block;
  });
  if (cursor !== DAY_MINUTES) throw new Error('sample plan must fill 1,440 minutes');
  const now = new Date().toISOString();
  return { schemaVersion: 2, planId: uid(), title: translate(locale, 'title.samplePlan'), locale, blocks, createdAt: now, updatedAt: now };
}

/* ── SBTI-style abstract engine (local, offline, live from the plan) ── */
// In the spirit of SBTI (Silly Big Personality Test, sbti.dev): an abstract,
// meme-flavored mirror of how a day is actually spent — never a clinical
// assessment. Codes and nicknames borrow the SBTI naming style; profiles are
// computed from the day's time allocation, not from questionnaire answers.

export type SbtiAxisId = 'order' | 'clock' | 'company' | 'margin';

export type SbtiAxis = {
  id: SbtiAxisId;
  leftKey: TranslationKey;
  rightKey: TranslationKey;
  leftPct: number; // 0–100, share of the left pole
  winner: TranslationKey;
};

export type SbtiPersonality = {
  code: string; // e.g. 'CTRL'
  axes: SbtiAxis[];
  sleepMin: number;
  createMin: number;
  socialMin: number;
  openMin: number;
};

type SbtiFeature = 'sleep' | 'work' | 'social' | 'play' | 'open' | 'exercise' | 'evening' | 'frag';

type SbtiProfile = {
  code: string;
  /** target value 0–1 per feature */
  features: Partial<Record<SbtiFeature, number>>;
  /** matching weight per feature */
  weights: Partial<Record<SbtiFeature, number>>;
  /** hard gates — profile only competes when every gate holds */
  gate?: Partial<Record<SbtiFeature, { min?: number; max?: number }>>;
};

/** Curated SBTI roster (clean-meme subset of the 27 types, 14 profiles). */
const SBTI_ROSTER: SbtiProfile[] = [
  { code: 'CTRL', features: { work: .3, exercise: .25, open: .03, frag: .2 }, weights: { work: 2, exercise: 2.5, open: 2, frag: 1.5 }, gate: { open: { max: .08 }, exercise: { min: .12 } } },
  { code: 'BOSS', features: { work: .5, open: .02, sleep: .2, frag: .15 }, weights: { work: 3.5, open: 2.5, sleep: 1.5, frag: 1 }, gate: { open: { max: .06 }, work: { min: .25 } } },
  { code: 'THIN-K', features: { work: .45, social: .05, play: .1, sleep: .25 }, weights: { work: 3, social: 2, play: 1.5, sleep: 1.5 }, gate: { work: { min: .3 }, social: { max: .12 }, play: { max: .15 } } },
  { code: 'THAN-K', features: { social: .3, sleep: .3, work: .25, open: .1 }, weights: { social: 1.5, sleep: 1, work: 1, open: 1 }, gate: { sleep: { min: .2, max: .42 }, work: { min: .12, max: .4 }, social: { min: .06, max: .3 }, play: { min: .08, max: .28 }, open: { max: .2 } } },
  { code: 'GOGO', features: { frag: .9, exercise: .2, work: .2, open: .15 }, weights: { frag: 3, exercise: 1.5, work: 1, open: 1 }, gate: { frag: { min: .55 } } },
  { code: 'LOVE-R', features: { social: .5, play: .2, sleep: .2 }, weights: { social: 3.5, play: 1.5, sleep: 1 }, gate: { social: { min: .3 } } },
  { code: 'MUM', features: { social: .5, sleep: .25, work: .2, play: .15 }, weights: { social: 2.5, sleep: 1, work: 1, play: 1 }, gate: { social: { min: .1 } } },
  { code: 'OJBK', features: { open: .5 }, weights: { open: 12 }, gate: { open: { min: .12 } } },
  { code: 'MALO', features: { work: .3, open: .02, evening: .5, frag: .5 }, weights: { work: 2.5, open: 2, evening: 2, frag: 2 }, gate: { evening: { min: .35 }, open: { max: .08 } } },
  { code: 'JOKE-R', features: { evening: .6, play: .3, social: .15, sleep: .2 }, weights: { evening: 3, play: 2, social: 1.5, sleep: 1 }, gate: { evening: { min: .4 } } },
  { code: 'ZZZZ', features: { sleep: .55, open: .1, work: .05 }, weights: { sleep: 6, open: 2, work: 2 }, gate: { sleep: { min: .5 } } },
  { code: 'MONK', features: { sleep: .38, open: .15, social: .05, play: .05 }, weights: { sleep: 3, open: 1.5, social: 1.5, play: 1 }, gate: { sleep: { min: .33, max: .55 }, social: { max: .1 } } },
  { code: 'HHHH', features: { play: .4, social: .2, sleep: .2 }, weights: { play: 3, social: 1.5, sleep: 1 }, gate: { play: { min: .25 } } },
  { code: 'SOLO', features: { social: .01, work: .15, play: .05, sleep: .3 }, weights: { social: 5, work: 2, play: 2, sleep: 1.5 }, gate: { social: { max: .05 }, open: { max: .25 }, sleep: { max: .45 } } },
];

export const SBTI_CODES = SBTI_ROSTER.map((profile) => profile.code) as string[];

const axisPoles: Record<SbtiAxisId, { leftKey: TranslationKey; rightKey: TranslationKey }> = {
  order: { leftKey: 'sbti.pole.orderL', rightKey: 'sbti.pole.orderR' },
  clock: { leftKey: 'sbti.pole.clockL', rightKey: 'sbti.pole.clockR' },
  company: { leftKey: 'sbti.pole.companyL', rightKey: 'sbti.pole.companyR' },
  margin: { leftKey: 'sbti.pole.marginL', rightKey: 'sbti.pole.marginR' },
};

const axisWinner = (left: TranslationKey, right: TranslationKey, leftPct: number) => leftPct >= 50 ? left : right;

/** Average day across saved plans — the "past, in total" view for SBTI.
 *  Category minutes are summed per category across all plans, then divided
 *  by the number of days so the result is one representative day. */
const HISTORY_ORDER: CategoryId[] = ['sleep', 'work-study', 'care', 'commute', 'food', 'exercise', 'social', 'play', 'personal', 'unallocated'];

export function averagePlan(plans: Plan[]): Plan {
  const now = new Date().toISOString();
  if (plans.length === 0) {
    return { schemaVersion: 2, planId: 'history-empty', title: '', locale: 'en-US', blocks: [], createdAt: now, updatedAt: now };
  }
  const totals: Record<string, number> = {};
  for (const plan of plans) {
    for (const block of plan.blocks) {
      totals[block.categoryId] = (totals[block.categoryId] ?? 0) + minutesOf(block);
    }
  }
  const days = plans.length;
  let cursor = 0;
  const blocks: TimeBlock[] = HISTORY_ORDER
    .filter((id) => (totals[id] ?? 0) > 0)
    .map((id) => {
      const minutes = totals[id]! / days;
      const block: TimeBlock = { id: `hist-${id}`, title: id, categoryId: id, startMin: cursor, endMin: cursor + minutes, confidence: 1 };
      cursor += minutes;
      return block;
    });
  return { schemaVersion: 2, planId: 'history-avg', title: 'history', locale: 'en-US', blocks, createdAt: now, updatedAt: now };
}

export function analyzeSBTI(plan: Plan): SbtiPersonality {  const totals = plan.blocks.reduce<Record<string, number>>((acc, block) => {
    acc[block.categoryId] = (acc[block.categoryId] ?? 0) + minutesOf(block);
    return acc;
  }, {});
  const g = (id: CategoryId) => totals[id] ?? 0;

  const sleep = g('sleep');
  const work = g('work-study');
  const social = g('social') + g('care');
  const play = g('play') + g('food') + g('commute');
  const exercise = g('exercise');
  const open = g('unallocated');
  const activeTotal = DAY_MINUTES - sleep;
  const evening = plan.blocks
    .filter((block) => block.categoryId !== 'sleep' && block.startMin >= 1020)
    .reduce((sum, block) => sum + minutesOf(block), 0) / (activeTotal || 1);
  const frag = Math.min(plan.blocks.length / 20, 1);

  const features: Record<SbtiFeature, number> = {
    sleep: sleep / DAY_MINUTES,
    work: work / DAY_MINUTES,
    social: social / DAY_MINUTES,
    play: play / DAY_MINUTES,
    open: open / DAY_MINUTES,
    exercise: exercise / DAY_MINUTES,
    evening,
    frag,
  };

  // Pick the best-matching profile among those whose gates hold.
  let best: SbtiProfile | null = null;
  let bestScore = -1;
  for (const profile of SBTI_ROSTER) {
    const gate = profile.gate;
    if (gate) {
      let passed = true;
      for (const [feature, range] of Object.entries(gate) as Array<[SbtiFeature, { min?: number; max?: number }]>) {
        const value = features[feature];
        if ((range.min !== undefined && value < range.min) || (range.max !== undefined && value > range.max)) { passed = false; break; }
      }
      if (!passed) continue;
    }
    let score = 0;
    let weight = 0;
    for (const [feature, target] of Object.entries(profile.features) as Array<[SbtiFeature, number]>) {
      const w = profile.weights[feature] ?? 1;
      score += (1 - Math.abs(features[feature] - target)) * w;
      weight += w;
    }
    if (weight > 0 && score / weight > bestScore) {
      bestScore = score / weight;
      best = profile;
    }
  }
  const code = best?.code ?? 'THAN-K';

  const avgMin = plan.blocks.length ? DAY_MINUTES / plan.blocks.length : DAY_MINUTES;
  const structuredPct = Math.min(avgMin / 900, 1) * 100;
  const axes: SbtiAxis[] = [
    { id: 'order', ...axisPoles.order, leftPct: 100 - structuredPct, winner: axisPoles.order.leftKey },
    { id: 'clock', ...axisPoles.clock, leftPct: evening * 100, winner: axisPoles.clock.leftKey },
    { id: 'company', ...axisPoles.company, leftPct: (1 - social / DAY_MINUTES) * 100, winner: axisPoles.company.leftKey },
    { id: 'margin', ...axisPoles.margin, leftPct: (1 - open / DAY_MINUTES) * 100, winner: axisPoles.margin.leftKey },
  ];
  for (const axis of axes) axis.winner = axisWinner(axis.leftKey, axis.rightKey, axis.leftPct);

  return {
    code,
    axes,
    sleepMin: sleep,
    createMin: work + g('personal') + g('play'),
    socialMin: g('social') + g('care') + g('food'),
    openMin: open,
  };
}

export type CategoryId =
  | 'sleep' | 'work-study' | 'care' | 'commute' | 'food'
  | 'exercise' | 'social' | 'play' | 'personal' | 'unallocated';

export type TimeBlock = {
  id: string;
  title: string;
  categoryId: CategoryId;
  startMin: number;
  endMin: number;
  confidence?: number;
};

export type Plan = {
  schemaVersion: 2;
  planId: string;
  title: string;
  locale: string;
  sourceText?: string;
  notes?: string;
  blocks: TimeBlock[];
  createdAt: string;
  updatedAt: string;
};

export type PublicPlan = {
  schemaVersion: 2;
  blocks: Array<{ categoryId: CategoryId; minutes: number; colorToken: string }>;
  comparisonIds: string[];
};

/** Category identity (colors only) — display labels live in the locale dictionaries. */
export const categories: Record<CategoryId, { color: string }> = {
  sleep: { color: '#101010' },
  'work-study': { color: '#d83048' },
  care: { color: '#f0d800' },
  commute: { color: '#bdbdbd' },
  food: { color: '#0090d8' },
  exercise: { color: '#009090' },
  social: { color: '#d83048' },
  play: { color: '#101010' },
  personal: { color: '#f0d800' },
  unallocated: { color: '#bdbdbd' },
};

const keywordMap: Array<[CategoryId, RegExp]> = [
  ['sleep', /sleep|nap|bed|rest|睡|午休/i],
  ['exercise', /walk|run|gym|yoga|swim|cycle|运动|散步|跑步|健身/i],
  ['food', /eat|breakfast|lunch|dinner|cook|coffee|吃|饭|咖啡|做饭/i],
  ['social', /friend|family|people|date|party|朋友|家人|社交/i],
  ['work-study', /work|make|create|write|study|learn|read|工作|创作|学习|阅读/i],
  ['care', /care|child|baby|parent|照顾|陪伴/i],
  ['commute', /commute|drive|train|bus|通勤|开车|地铁/i],
  ['play', /play|game|music|movie|wander|游戏|电影|音乐/i],
];

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const minutesOf = (block: TimeBlock) => block.endMin - block.startMin;
export const formatTime = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const parseTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 24 && minute >= 0 && minute < 60 && !(hour === 24 && minute > 0) ? hour * 60 + minute : null;
};

export function validateBlocks(blocks: TimeBlock[]): string[] {
  const errors: string[] = [];
  if (blocks.length > MAX_BLOCKS) errors.push('TOO_MANY_BLOCKS');
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  sorted.forEach((block, index) => {
    if (!Number.isInteger(block.startMin) || !Number.isInteger(block.endMin)) errors.push('NON_INTEGER_TIME');
    if (block.startMin < 0 || block.endMin > DAY_MINUTES || block.endMin <= block.startMin) errors.push('INVALID_RANGE');
    if (index > 0 && sorted[index - 1]!.endMin > block.startMin) errors.push('TIME_OVERLAP');
  });
  return [...new Set(errors)];
}

export function classifyLocally(text: string, locale: Locale = 'en-US'): Plan {
  const raw = text.split(/[,，;；\n]+/).map((part) => part.trim()).filter(Boolean).slice(0, MAX_BLOCKS);
  const titles = raw.length ? raw : fallbackTitles[locale];
  const minimumSleep = titles.some((title) => keywordMap[0]![1].test(title)) ? 0 : 480;
  const available = DAY_MINUTES - minimumSleep;
  const base = Math.floor(available / titles.length);
  let cursor = 0;
  const blocks: TimeBlock[] = [];
  if (minimumSleep) {
    blocks.push({ id: uid(), title: translate(locale, 'title.sleepBlock'), categoryId: 'sleep', startMin: 0, endMin: minimumSleep, confidence: 1 });
    cursor = minimumSleep;
  }
  titles.forEach((title, index) => {
    const categoryId = keywordMap.find(([, pattern]) => pattern.test(title))?.[0] ?? 'personal';
    const duration = index === titles.length - 1 ? DAY_MINUTES - cursor : base;
    blocks.push({ id: uid(), title: title.slice(0, 80), categoryId, startMin: cursor, endMin: cursor + duration, confidence: .72 });
    cursor += duration;
  });
  const now = new Date().toISOString();
  return { schemaVersion: 2, planId: uid(), title: translate(locale, 'title.defaultPlan'), locale, sourceText: text, blocks, createdAt: now, updatedAt: now };
}

export function planFromDraft(draft: unknown, sourceText: string, locale: Locale = 'en-US'): Plan | null {
  if (!draft || typeof draft !== 'object') return null;
  const value = draft as { schemaVersion?: unknown; blocks?: unknown };
  if (value.schemaVersion !== 1 || !Array.isArray(value.blocks) || !value.blocks.length || value.blocks.length > MAX_BLOCKS) return null;
  let cursor = 0;
  const blocks: TimeBlock[] = [];
  for (const raw of value.blocks) {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const allowed = ['title', 'categoryId', 'startMin', 'endMin', 'durationMin', 'confidence'];
    if (Object.keys(record).some((key) => !allowed.includes(key))) return null;
    if (typeof record.title !== 'string' || record.title.length < 1 || record.title.length > 80 || !(record.categoryId as string in categories)) return null;
    const startMin = typeof record.startMin === 'number' ? record.startMin : cursor;
    const endMin = typeof record.endMin === 'number' ? record.endMin : typeof record.durationMin === 'number' ? startMin + record.durationMin : NaN;
    if (!Number.isInteger(startMin) || !Number.isInteger(endMin) || startMin !== cursor) return null;
    blocks.push({
      id: uid(), title: record.title, categoryId: record.categoryId as CategoryId, startMin, endMin,
      ...(typeof record.confidence === 'number' ? { confidence: record.confidence } : {}),
    });
    cursor = endMin;
  }
  if (cursor !== DAY_MINUTES || validateBlocks(blocks).length) return null;
  const now = new Date().toISOString();
  return { schemaVersion: 2, planId: uid(), title: translate(locale, 'title.defaultPlan'), locale, sourceText, blocks, createdAt: now, updatedAt: now };
}

export function resizeSharedBoundary(blocks: TimeBlock[], index: number, nextBoundary: number, snap = 5) {
  const rounded = Math.round(nextBoundary / snap) * snap;
  const current = blocks[index];
  const next = blocks[index + 1];
  if (!current || !next || current.endMin !== next.startMin || rounded <= current.startMin || rounded >= next.endMin) {
    return { ok: false as const, code: 'TIME_OVERLAP', blocks };
  }
  const updated = blocks.map((block) => ({ ...block }));
  updated[index]!.endMin = rounded;
  updated[index + 1]!.startMin = rounded;
  return { ok: true as const, blocks: updated };
}

export function resizeSingleBoundary(blocks: TimeBlock[], index: number, endMin: number) {
  const block = blocks[index];
  if (!block || endMin <= block.startMin || endMin > DAY_MINUTES || (blocks[index + 1] && endMin > blocks[index + 1]!.startMin)) {
    return { ok: false as const, code: 'TIME_OVERLAP', blocks };
  }
  const updated = blocks.map((item) => ({ ...item }));
  updated[index]!.endMin = endMin;
  return { ok: true as const, blocks: updated };
}

export function mergeOpenTime(blocks: TimeBlock[]): TimeBlock[] {
  const merged: TimeBlock[] = [];
  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (
      previous && previous.categoryId === 'unallocated' && block.categoryId === 'unallocated'
      && previous.endMin === block.startMin
    ) {
      previous.endMin = block.endMin;
      continue;
    }
    merged.push({ ...block });
  }
  return merged;
}

export function deleteAsOpenTime(blocks: TimeBlock[], id: string, locale: Locale = 'en-US'): TimeBlock[] {
  const opened = blocks.map((block) => block.id === id
    ? { ...block, title: translate(locale, 'title.openBlock'), categoryId: 'unallocated' as CategoryId, confidence: 1 }
    : block);
  return mergeOpenTime(opened);
}

/**
 * Removes a block entirely and slides every later block forward to close the gap.
 * Durations are preserved; the final block absorbs the freed span so the day
 * stays a continuous 0 → 24:00 line.
 */
export function deleteBlock(blocks: TimeBlock[], id: string): { ok: true; blocks: TimeBlock[] } | { ok: false; code: 'NOT_FOUND' | 'TOO_FEW' } {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) return { ok: false, code: 'NOT_FOUND' };
  if (blocks.length <= 1) return { ok: false, code: 'TOO_FEW' };
  const span = blocks[index]!.endMin - blocks[index]!.startMin;
  const updated: TimeBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (i === index) continue;
    const block = blocks[i]!;
    if (i > index) {
      updated.push({ ...block, startMin: block.startMin - span, endMin: block.endMin - span });
    } else {
      updated.push({ ...block });
    }
  }
  const last = updated[updated.length - 1]!;
  last.endMin = DAY_MINUTES;
  return { ok: true, blocks: updated };
}

export function splitBlock(blocks: TimeBlock[], id: string, snap = 5): { ok: true; blocks: TimeBlock[] } | { ok: false; code: 'TOO_SHORT' | 'TOO_MANY_BLOCKS' } {
  const index = blocks.findIndex((block) => block.id === id);
  const block = blocks[index];
  if (!block) return { ok: false, code: 'TOO_SHORT' };
  if (blocks.length >= MAX_BLOCKS) return { ok: false, code: 'TOO_MANY_BLOCKS' };
  const span = block.endMin - block.startMin;
  const step = Math.max(1, snap);
  // Split near the middle, snapped, keeping both halves at least one integer minute.
  let midpoint = block.startMin + Math.round(span / 2 / step) * step;
  if (midpoint <= block.startMin) midpoint = block.startMin + 1;
  if (midpoint >= block.endMin) midpoint = block.endMin - 1;
  if (midpoint <= block.startMin || midpoint >= block.endMin) return { ok: false, code: 'TOO_SHORT' };
  const first: TimeBlock = { ...block, endMin: midpoint };
  const second: TimeBlock = { ...block, id: uid(), title: block.title, startMin: midpoint, endMin: block.endMin };
  return { ok: true, blocks: [...blocks.slice(0, index), first, second, ...blocks.slice(index + 1)] };
}

export function sanitizeForShare(plan: Plan): PublicPlan {
  return {
    schemaVersion: 2,
    blocks: plan.blocks.map((block) => ({
      categoryId: block.categoryId,
      minutes: minutesOf(block),
      colorToken: categories[block.categoryId].color,
    })),
    comparisonIds: comparisons(plan).slice(0, 5).map((item) => item.id),
  };
}

export type Comparison = { id: string; text: string; detail: string; raw: number };
const comparisonLedger = [
  { id: 'books', category: 'work-study' as CategoryId, unit: 360 },
  { id: 'walks', category: 'exercise' as CategoryId, unit: 30 },
  { id: 'dinners', category: 'food' as CategoryId, unit: 90 },
  { id: 'calls', category: 'social' as CategoryId, unit: 20 },
  { id: 'naps', category: 'sleep' as CategoryId, unit: 20 },
  { id: 'albums', category: 'play' as CategoryId, unit: 45 },
  { id: 'tea', category: 'personal' as CategoryId, unit: 15 },
  { id: 'commutes', category: 'commute' as CategoryId, unit: 40 },
  { id: 'bedtimes', category: 'care' as CategoryId, unit: 30 },
  { id: 'blank', category: 'unallocated' as CategoryId, unit: 60 },
  { id: 'sunsets', category: 'personal' as CategoryId, unit: 20 },
  { id: 'chapters', category: 'work-study' as CategoryId, unit: 25 },
  { id: 'songs', category: 'play' as CategoryId, unit: 4 },
  { id: 'picnics', category: 'social' as CategoryId, unit: 120 },
  { id: 'recipes', category: 'food' as CategoryId, unit: 60 },
  { id: 'stretches', category: 'exercise' as CategoryId, unit: 10 },
  { id: 'trainrides', category: 'commute' as CategoryId, unit: 25 },
  { id: 'checkins', category: 'care' as CategoryId, unit: 15 },
  { id: 'dreams', category: 'sleep' as CategoryId, unit: 90 },
  { id: 'nothing', category: 'unallocated' as CategoryId, unit: 15 },
];

const comparisonNounKey = (id: string) => `cmp.${id}` as TranslationKey;

export function comparisons(plan: Plan, locale: Locale = 'en-US'): Comparison[] {
  const totals = plan.blocks.reduce<Record<string, number>>((acc, block) => {
    acc[block.categoryId] = (acc[block.categoryId] ?? 0) + minutesOf(block);
    return acc;
  }, {});
  return comparisonLedger
    .map((item) => {
      const daily = totals[item.category] ?? 0;
      const raw = daily * 365 / item.unit;
      const rounded = Math.round(raw);
      const noun = translate(locale, comparisonNounKey(item.id));
      const unitNoun = locale === 'zh-CN' ? noun : noun.replace(/s$/, '');
      return {
        id: item.id,
        raw,
        text: translate(locale, 'cmp.text', { n: rounded.toLocaleString(locale), noun }),
        detail: translate(locale, 'cmp.detail', { daily, unit: item.unit, unitNoun, raw, source: translate(locale, 'cmp.source') }),
      };
    })
    .filter((item) => item.raw > 0)
    .sort((a, b) => b.raw - a.raw);
}
