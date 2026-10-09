import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMPTY, ImportError, StorageWriteError, exportBackup, load, loadCollapsed, parseBackup, save, saveCollapsed,
} from './storage';
import { bill, installStorage, task, type MemoryStorage } from './testing';

const data = { tasks: [task({ items: [{ text: 'Milk', done: true }] })], bills: [bill({ day: 25 })] };

let store: MemoryStorage;
beforeEach(() => {
  store = installStorage();
});

describe('storage', () => {
  it('round-trips saved data', () => {
    save(data);
    expect(load()).toEqual(data);
  });

  it('starts the month from when a task was added for data saved before the move-up rule', () => {
    const old = { ...task({ createdAt: 1234 }) } as Record<string, unknown>;
    delete old['listSince'];
    localStorage.setItem('life-admin:data', JSON.stringify({ tasks: [old], bills: [] }));
    expect(load().tasks[0]?.listSince).toBe(1234);
  });

  it('starts empty on first open', () => {
    expect(load()).toEqual(EMPTY);
  });

  it('sets unreadable data aside instead of overwriting it', () => {
    localStorage.setItem('life-admin:data', '{"tasks":[{"id":1}],"bills":[]}');
    expect(load()).toEqual(EMPTY);
    const kept = store.keys().filter((k) => k.startsWith('life-admin:data:unreadable:'));
    expect(kept).toHaveLength(1);
  });

  it('reports a failed write instead of losing it silently', () => {
    store.failNextWrite = true;
    expect(() => save(data)).toThrow(StorageWriteError);
  });

  it('remembers collapsed lists and ignores unknown names', () => {
    saveCollapsed(['remaining', 'high']);
    expect(loadCollapsed()).toEqual(['high', 'remaining']);
    localStorage.setItem('life-admin:collapsed', '["bogus"]');
    expect(loadCollapsed()).toEqual([]);
  });
});

describe('backups', () => {
  it('imports what it exported', () => {
    expect(parseBackup(exportBackup(data, new Date()))).toEqual(data);
  });

  it('rejects files that are not a Life Admin backup', () => {
    expect(() => parseBackup('not json')).toThrow(ImportError);
    expect(() => parseBackup('{"tasks":[],"bills":[]}')).toThrow(ImportError);
  });

  it('rejects a damaged backup rather than importing part of it', () => {
    const broken = JSON.parse(exportBackup(data, new Date()));
    broken.tasks[0].priority = 'urgent';
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('damaged');
  });
});
