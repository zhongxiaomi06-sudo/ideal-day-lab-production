import type { Plan } from './domain';
import { MAX_PLANS, validateBlocks } from './domain';
import { auth } from '@eazo/sdk';

const DB_NAME = 'eazo-ideal-day-lab';
const STORE = 'plans';

export type StorageMode = 'local' | 'remote';

let mode: StorageMode = 'local';

export function setStorageMode(next: StorageMode) { mode = next; }
export function getStorageMode(): StorageMode { return mode; }

/* ── local (IndexedDB, signed-out fallback) ───────────────────────── */

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 2);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'planId' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const requestValue = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function listLocal(): Promise<Plan[]> {
  const db = await openDatabase();
  const values = await requestValue(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()) as Plan[];
  db.close();
  return values.filter((plan) => plan.schemaVersion === 2 && validateBlocks(plan.blocks).length === 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveLocal(plan: Plan): Promise<{ ok: true } | { ok: false; code: 'PLAN_LIMIT' }> {
  const existing = await listLocal();
  if (!existing.some((item) => item.planId === plan.planId) && existing.length >= MAX_PLANS) return { ok: false, code: 'PLAN_LIMIT' };
  const db = await openDatabase();
  await requestValue(db.transaction(STORE, 'readwrite').objectStore(STORE).put(plan));
  db.close();
  return { ok: true };
}

async function removeLocal(planId: string) {
  const db = await openDatabase();
  await requestValue(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(planId));
  db.close();
}

/* ── remote (authenticated, per-user) ─────────────────────────────── */

async function sessionHeaders(): Promise<Record<string, string> | null> {
  const session = await auth.getSessionHeader();
  if (!session) return null;
  return { 'x-eazo-session': session, 'content-type': 'application/json' };
}

async function listRemote(): Promise<Plan[]> {
  const headers = await sessionHeaders();
  if (!headers) throw new Error('not authenticated');
  const response = await fetch('/api/plans', { headers });
  if (!response.ok) throw new Error(`list plans failed: ${response.status}`);
  const plans = await response.json() as Plan[];
  return plans.filter((plan) => plan && plan.schemaVersion === 2 && validateBlocks(plan.blocks).length === 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveRemote(plan: Plan): Promise<{ ok: true } | { ok: false; code: 'PLAN_LIMIT' | 'NETWORK' }> {
  const headers = await sessionHeaders();
  if (!headers) throw new Error('not authenticated');
  const response = await fetch(`/api/plans/${encodeURIComponent(plan.planId)}`, {
    method: 'PUT', headers, body: JSON.stringify(plan),
  });
  if (!response.ok) return { ok: false, code: 'NETWORK' };
  return { ok: true };
}

async function removeRemote(planId: string) {
  const headers = await sessionHeaders();
  if (!headers) throw new Error('not authenticated');
  await fetch(`/api/plans/${encodeURIComponent(planId)}`, { method: 'DELETE', headers });
}

/** Push every local plan into the user's cloud store (idempotent merge). */
export async function syncLocalToRemote(): Promise<number> {
  const local = await listLocal();
  if (local.length === 0) return 0;
  const headers = await sessionHeaders();
  if (!headers) throw new Error('not authenticated');
  const response = await fetch('/api/plans?bulk=1', {
    method: 'POST', headers, body: JSON.stringify(local),
  });
  if (!response.ok) throw new Error(`sync failed: ${response.status}`);
  const result = await response.json() as { count?: number };
  return result.count ?? local.length;
}

/* ── public API (mode-aware) ─────────────────────────────────────── */

export async function listPlans(): Promise<Plan[]> {
  if (mode === 'remote') {
    try { return await listRemote(); } catch { /* fall through to local */ }
  }
  return listLocal();
}

export async function savePlan(plan: Plan): Promise<{ ok: true } | { ok: false; code: 'PLAN_LIMIT' | 'NETWORK' }> {
  if (mode === 'remote') {
    try { return await saveRemote(plan); } catch { /* fall through to local */ }
  }
  return saveLocal(plan);
}

export async function removePlan(planId: string) {
  if (mode === 'remote') {
    try { await removeRemote(planId); return; } catch { /* fall through to local */ }
  }
  await removeLocal(planId);
}
