import { describe, expect, test } from 'vitest';
import {
  DAY_MINUTES, analyzeSBTI, SBTI_CODES, classifyLocally, comparisons, deleteAsOpenTime, deleteBlock, mergeOpenTime,
  planFromDraft, resizeSharedBoundary, resizeSingleBoundary, samplePlan, sanitizeForShare,
  splitBlock, validateBlocks,
} from './domain';
import type { Plan, TimeBlock } from './domain';

const adjacent: TimeBlock[] = [
  { id: 'a', title: 'A', categoryId: 'work-study', startMin: 480, endMin: 540 },
  { id: 'b', title: 'B', categoryId: 'play', startMin: 540, endMin: 600 },
];

describe('Ideal Day production contracts', () => {
  test('TEST-DAY-002 local classification produces exactly 1,440 integer minutes', () => {
    const plan = classifyLocally('sleep, make, walk, eat with friends');
    expect(plan.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(DAY_MINUTES);
    expect(validateBlocks(plan.blocks)).toEqual([]);
  });

  test('TEST-DAY-003 hostile text remains inert data in local fallback', () => {
    const plan = classifyLocally('<img src=x onerror=alert(1)>, unknown activity');
    expect(plan.blocks.some((block) => block.title.includes('<img'))).toBe(true);
    expect(plan.blocks.every((block) => block.categoryId !== ('<script>' as never))).toBe(true);
  });

  test('TEST-DAY-003 rejects unknown AI fields and accepts a strict 1,440-minute draft', () => {
    expect(planFromDraft({ schemaVersion: 1, blocks: [{ title: '<img onerror=alert(1)>', categoryId: 'sleep', durationMin: 1440, html: true }] }, 'private')).toBeNull();
    const valid = planFromDraft({ schemaVersion: 1, blocks: [{ title: 'Sleep', categoryId: 'sleep', durationMin: 480 }, { title: 'Create', categoryId: 'work-study', durationMin: 960 }] }, 'private');
    expect(valid?.blocks.at(-1)?.endMin).toBe(1440);
  });

  test('TEST-DAY-004 shared boundary moves both blocks and keeps total', () => {
    const result = resizeSharedBoundary(adjacent, 0, 555, 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks[0]?.endMin).toBe(555);
      expect(result.blocks[1]?.startMin).toBe(555);
      expect(result.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(120);
    }
  });

  test('TEST-DAY-004 single boundary overlap is rejected without mutation', () => {
    const result = resizeSingleBoundary(adjacent, 0, 555);
    expect(result).toEqual({ ok: false, code: 'TIME_OVERLAP', blocks: adjacent });
    expect(adjacent[0]?.endMin).toBe(540);
  });

  test('TEST-DAY-005 comparison exposes exact 182.5 raw value and rounding', () => {
    const plan: Plan = { schemaVersion: 2, planId: 'p', title: 'P', locale: 'en-US', createdAt: '', updatedAt: '', blocks: [
      { id: 'x', title: 'Friends', categoryId: 'social', startMin: 0, endMin: 60 },
    ] };
    const dinner = comparisons(plan).find((item) => item.id === 'picnics');
    expect(dinner?.raw).toBe(182.5);
    expect(dinner?.detail).toContain('60 min/day × 365 days ÷ 120');
  });

  test('TEST-DAY-007 share snapshot excludes private source, title, notes and ids', () => {
    const plan = { ...classifyLocally('private diary text'), title: 'Private title', notes: 'Private note' };
    const exported = JSON.stringify(sanitizeForShare(plan));
    expect(exported).not.toContain('private');
    expect(exported).not.toContain(plan.planId);
    expect(exported).not.toContain(plan.blocks[0]!.id);
    expect(exported).toContain('categoryId');
  });

  test('TEST-DAY-005 comparison ledger has at least 20 usable entries', () => {
    const ids = ['sleep', 'work-study', 'care', 'commute', 'food', 'exercise', 'social', 'play', 'personal', 'unallocated'] as const;
    const blocks = ids.map((categoryId, index) => ({ id: categoryId, title: categoryId, categoryId, startMin: index * 60, endMin: index * 60 + 60 }));
    const plan: Plan = { schemaVersion: 2, planId: 'all', title: 'All', locale: 'en-US', createdAt: '', updatedAt: '', blocks };
    expect(comparisons(plan).length).toBeGreaterThanOrEqual(20);
  });

  test('deleteAsOpenTime merges adjacent open-time blocks and conserves the day', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'A', categoryId: 'unallocated', startMin: 0, endMin: 480 },
      { id: 'b', title: 'B', categoryId: 'work-study', startMin: 480, endMin: 960 },
      { id: 'c', title: 'C', categoryId: 'unallocated', startMin: 960, endMin: 1440 },
    ];
    const result = deleteAsOpenTime(blocks, 'b');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ categoryId: 'unallocated', startMin: 0, endMin: 1440 });
    expect(validateBlocks(result)).toEqual([]);
  });

  test('mergeOpenTime leaves non-open blocks untouched', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'A', categoryId: 'unallocated', startMin: 0, endMin: 60 },
      { id: 'b', title: 'B', categoryId: 'work-study', startMin: 60, endMin: 120 },
    ];
    expect(mergeOpenTime(blocks)).toHaveLength(2);
  });

  test('splitBlock divides one block into two adjacent blocks preserving total minutes', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'Focus', categoryId: 'work-study', startMin: 0, endMin: 1440 },
    ];
    const result = splitBlock(blocks, 'a', 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0]!.startMin).toBe(0);
      expect(result.blocks[0]!.endMin).toBe(result.blocks[1]!.startMin);
      expect(result.blocks[1]!.endMin).toBe(1440);
      expect(result.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(1440);
      expect(validateBlocks(result.blocks)).toEqual([]);
    }
  });

  test('splitBlock rejects a block too short to divide', () => {
    const blocks: TimeBlock[] = [{ id: 'a', title: 'Tiny', categoryId: 'play', startMin: 0, endMin: 1 }];
    const result = splitBlock(blocks, 'a', 5);
    expect(result).toEqual({ ok: false, code: 'TOO_SHORT' });
  });

  test('deleteBlock removes a middle block, slides later blocks forward, and keeps 24h continuous', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'Sleep', categoryId: 'sleep', startMin: 0, endMin: 400 },
      { id: 'b', title: 'Focus', categoryId: 'work-study', startMin: 400, endMin: 640 },
      { id: 'c', title: 'Walk', categoryId: 'exercise', startMin: 640, endMin: 760 },
      { id: 'd', title: 'Drift', categoryId: 'play', startMin: 760, endMin: 1440 },
    ];
    const result = deleteBlock(blocks, 'b');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks.map((b) => b.id)).toEqual(['a', 'c', 'd']);
      expect(result.blocks[1]).toMatchObject({ id: 'c', startMin: 400, endMin: 520 }); // slid 240 min earlier, duration kept
      expect(result.blocks[2]).toMatchObject({ id: 'd', startMin: 520, endMin: 1440 }); // absorbs freed span
      expect(result.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(1440);
      expect(validateBlocks(result.blocks)).toEqual([]);
    }
  });

  test('deleteBlock slides nothing when the first block is removed', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'A', categoryId: 'work-study', startMin: 0, endMin: 480 },
      { id: 'b', title: 'B', categoryId: 'play', startMin: 480, endMin: 1440 },
    ];
    const result = deleteBlock(blocks, 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toMatchObject({ id: 'b', startMin: 0, endMin: 1440 });
      expect(validateBlocks(result.blocks)).toEqual([]);
    }
  });

  test('deleteBlock absorbs into the previous block when the last one is removed', () => {
    const blocks: TimeBlock[] = [
      { id: 'a', title: 'A', categoryId: 'work-study', startMin: 0, endMin: 480 },
      { id: 'b', title: 'B', categoryId: 'play', startMin: 480, endMin: 1440 },
    ];
    const result = deleteBlock(blocks, 'b');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]).toMatchObject({ id: 'a', startMin: 0, endMin: 1440 });
    }
  });

  test('deleteBlock rejects unknown ids and a single remaining block', () => {
    const blocks: TimeBlock[] = [{ id: 'a', title: 'A', categoryId: 'work-study', startMin: 0, endMin: 1440 }];
    expect(deleteBlock(blocks, 'nope')).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(deleteBlock(blocks, 'a')).toEqual({ ok: false, code: 'TOO_FEW' });
  });

  test('samplePlan fills exactly 1,440 minutes with valid, localized blocks', () => {
    const plan = samplePlan('zh-CN');
    expect(plan.blocks.reduce((sum, block) => sum + block.endMin - block.startMin, 0)).toBe(DAY_MINUTES);
    expect(validateBlocks(plan.blocks)).toEqual([]);
    expect(plan.blocks[0]).toMatchObject({ categoryId: 'sleep', startMin: 0, endMin: 400 });
    expect(plan.blocks.at(-1)).toMatchObject({ categoryId: 'play', endMin: 1440 });
    expect(plan.blocks.some((block) => block.title.includes('睡'))).toBe(true);
    expect(plan.locale).toBe('zh-CN');
    // English plan titles differ.
    const en = samplePlan('en-US');
    expect(en.blocks[0]!.title).toBe('Sleep well');
  });

  test('analyzeSBTI derives an SBTI code and four abstract axes from category totals', () => {
    const plan = samplePlan('en-US');
    const reading = analyzeSBTI(plan);
    expect(SBTI_CODES).toContain(reading.code);
    expect(reading.axes).toHaveLength(4);
    for (const axis of reading.axes) {
      expect(axis.leftPct).toBeGreaterThanOrEqual(0);
      expect(axis.leftPct).toBeLessThanOrEqual(100);
      expect(axis.winner).toBe(axis.leftPct >= 50 ? axis.leftKey : axis.rightKey);
    }
    expect(reading.sleepMin).toBe(400);
    expect(reading.createMin).toBe(630); // work-study 280 + personal 180 + play 170
    expect(reading.socialMin).toBe(290); // social 60 + care 110 + food 120
  });

  test('analyzeSBTI stays stable when open time dominates', () => {
    const plan: Plan = { schemaVersion: 2, planId: 'p', title: 'P', locale: 'en-US', createdAt: '', updatedAt: '', blocks: [
      { id: 'a', title: 'Open', categoryId: 'unallocated', startMin: 0, endMin: 1440 },
    ] };
    const reading = analyzeSBTI(plan);
    expect(reading.openMin).toBe(1440);
    expect(reading.code).toBe('OJBK');
  });

  test('analyzeSBTI maps extreme days to the expected meme types', () => {
    const day = (categoryId: TimeBlock['categoryId'], startMin: number, endMin: number): TimeBlock => ({ id: `b${startMin}`, title: categoryId, categoryId, startMin, endMin });
    // All-sleep day → ZZZZ (the sleeper).
    expect(analyzeSBTI({ schemaVersion: 2, planId: 'p', title: 'P', locale: 'en-US', createdAt: '', updatedAt: '', blocks: [day('sleep', 0, 1440)] }).code).toBe('ZZZZ');
    // Crunchy full workday → BOSS (the leader).
    expect(analyzeSBTI({ schemaVersion: 2, planId: 'p', title: 'P', locale: 'en-US', createdAt: '', updatedAt: '', blocks: [
      day('sleep', 0, 360), day('work-study', 360, 480), day('work-study', 480, 780), day('work-study', 780, 1080), day('work-study', 1080, 1440),
    ] }).code).toBe('BOSS');
  });
});
