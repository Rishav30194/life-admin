import type { Bill, Task } from './types';

/** Test-only factories. Each test states only the fields its rule depends on. */
export function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Car wash',
    priority: 'medium',
    due: null,
    items: null,
    done: false,
    doneAt: null,
    createdAt: 1,
    listSince: 1,
    billId: null,
    month: null,
    ...over,
  };
}

export function bill(over: Partial<Bill> = {}): Bill {
  return {
    id: 'rent',
    name: 'Pay rent',
    day: 1,
    startMonth: '2026-10',
    lastGenerated: null,
    createdAt: 1,
    ...over,
  };
}

/** Local noon, so no test depends on the machine's time zone. */
export const at = (date: string) => new Date(`${date}T12:00:00`);

/**
 * Minimal in-memory `localStorage`, installed on globalThis by the storage tests.
 * Node's own experimental `localStorage` shadows jsdom's, so the tests supply the global.
 */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  /** Set to throw on the next write, to exercise the out-of-space path. */
  failNextWrite = false;

  get length(): number {
    return this.map.size;
  }

  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }

  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }

  setItem(k: string, v: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.map.set(k, v);
  }

  removeItem(k: string): void {
    this.map.delete(k);
  }

  clear(): void {
    this.map.clear();
  }

  keys(): string[] {
    return [...this.map.keys()];
  }
}

/** Installs a fresh store and returns it. */
export function installStorage(): MemoryStorage {
  const store = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true, writable: true });
  return store;
}
