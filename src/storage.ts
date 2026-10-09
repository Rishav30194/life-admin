import { PRIORITIES } from './types';
import type { AppData, Bill, ChecklistItem, Priority, Task } from './types';

/** All persistence goes through this file. No component touches localStorage. */

const DATA_KEY = 'life-admin:data';
const COLLAPSED_KEY = 'life-admin:collapsed';
const BACKUP_APP = 'life-admin';
const SCHEMA = 1;

export const EMPTY: AppData = { tasks: [], bills: [] };

export class StorageWriteError extends Error {}

export class ImportError extends Error {}

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';
const isDate = (v: unknown): v is string => str(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: unknown): v is string => str(v) && /^\d{4}-\d{2}$/.test(v);

function readItem(v: unknown): ChecklistItem | null {
  if (!isObj(v) || !str(v['text']) || typeof v['done'] !== 'boolean') return null;
  return { text: v['text'], done: v['done'] };
}

function readTask(v: unknown): Task | null {
  if (!isObj(v)) return null;
  const { id, title, priority, due, items, done, doneAt, createdAt, billId, month } = v;
  if (!str(id) || !str(title) || !PRIORITIES.includes(priority as Priority)) return null;
  if (!(due === null || isDate(due)) || !(doneAt === null || isDate(doneAt))) return null;
  if (typeof done !== 'boolean' || typeof createdAt !== 'number') return null;
  if (!strOrNull(billId) || !(month === null || isMonth(month))) return null;
  let list: ChecklistItem[] | null = null;
  if (items !== null) {
    if (!Array.isArray(items)) return null;
    list = items.map(readItem).filter((x): x is ChecklistItem => x !== null);
    if (list.length !== items.length) return null;
  }
  // Saved before tasks moved up after a month: the clock starts from when the task was added.
  const listSince = typeof v['listSince'] === 'number' ? v['listSince'] : createdAt;
  return {
    id, title, priority: priority as Priority, due, items: list?.length ? list : null,
    done, doneAt, createdAt, listSince, billId, month,
  };
}

function readBill(v: unknown): Bill | null {
  if (!isObj(v)) return null;
  const { id, name, day, startMonth, lastGenerated, createdAt } = v;
  if (!str(id) || !str(name) || !Number.isInteger(day) || (day as number) < 1 || (day as number) > 31) return null;
  if (!isMonth(startMonth) || !(lastGenerated === null || isMonth(lastGenerated))) return null;
  if (typeof createdAt !== 'number') return null;
  return { id, name, day: day as number, startMonth, lastGenerated, createdAt };
}

/** Reads untrusted data. Any malformed record rejects the whole lot rather than half-loading it. */
function readData(v: unknown): AppData | null {
  if (!isObj(v) || !Array.isArray(v['tasks']) || !Array.isArray(v['bills'])) return null;
  const tasks = v['tasks'].map(readTask);
  const bills = v['bills'].map(readBill);
  if (tasks.includes(null) || bills.includes(null)) return null;
  return { tasks: tasks as Task[], bills: bills as Bill[] };
}

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Loads saved data. Unreadable data is set aside under a separate key, not
 * overwritten, so a bug here can't destroy someone's list.
 */
export function load(): AppData {
  const raw = getItem(DATA_KEY);
  if (raw === null) return EMPTY;
  try {
    const data = readData(JSON.parse(raw));
    if (data) return data;
  } catch {
    // Falls through to setting the raw text aside.
  }
  try {
    localStorage.setItem(`${DATA_KEY}:unreadable:${Date.now()}`, raw);
    localStorage.removeItem(DATA_KEY);
  } catch {
    // Nothing more can be done; the app starts empty and the raw text stays where it is.
  }
  return EMPTY;
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    throw new StorageWriteError("Couldn't save. Your phone may be out of storage.");
  }
}

export function loadCollapsed(): Priority[] {
  try {
    const v: unknown = JSON.parse(getItem(COLLAPSED_KEY) ?? '[]');
    return Array.isArray(v) ? PRIORITIES.filter((p) => v.includes(p)) : [];
  } catch {
    return [];
  }
}

export function saveCollapsed(collapsed: Iterable<Priority>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Which lists are folded is a convenience; losing it isn't worth an error.
  }
}

/**
 * Asks the browser not to clear this app's data when space runs low. Safari can still
 * decline; installing to the Home Screen is what protects the data on iOS.
 */
export function requestPersistence(): void {
  void navigator.storage?.persist?.().catch(() => {});
}

export function exportBackup(data: AppData, now: Date): string {
  return JSON.stringify({ app: BACKUP_APP, schema: SCHEMA, exportedAt: now.toISOString(), ...data }, null, 2);
}

export function parseBackup(json: string): AppData {
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch {
    throw new ImportError("That file isn't a Life Admin backup.");
  }
  if (!isObj(v) || v['app'] !== BACKUP_APP) throw new ImportError("That file isn't a Life Admin backup.");
  if (v['schema'] !== SCHEMA) throw new ImportError('That backup is from a different version of the app.');
  const data = readData(v);
  if (!data) throw new ImportError('That backup is damaged, so nothing was imported.');
  return data;
}
