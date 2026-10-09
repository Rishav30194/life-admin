import { describe, expect, it } from 'vitest';
import {
  MOVE_UP_AFTER_MS, addItem, canDelete, countMovedUp, createTask, groupTasks, moveTo, moveUpIfStale, priorityOf, rename,
  setDue, setItemText, toggleDone, toggleItem,
} from './tasks';
import { task } from './testing';

const TODAY = '2026-10-08';
const list = (...done: boolean[]) => done.map((d, i) => ({ text: `item ${i}`, done: d }));

describe('placement', () => {
  it('keeps monthly bills in Critical', () => {
    expect(priorityOf(task({ billId: 'rent', priority: 'medium' }))).toBe('critical');
    expect(moveTo(task({ billId: 'rent', priority: 'critical' }), 'medium', 5).priority).toBe('critical');
  });

  it('never moves a task because of its due date', () => {
    expect(priorityOf(setDue(task({ priority: 'remaining' }), TODAY))).toBe('remaining');
  });

  it('never lets a monthly bill be deleted, only ticked off', () => {
    expect(canDelete(task({ billId: 'rent' }))).toBe(false);
    expect(canDelete(task())).toBe(true);
  });

  it('moves any other task to any list', () => {
    expect(moveTo(task({ priority: 'critical' }), 'remaining', 5).priority).toBe('remaining');
  });
});

describe('groupTasks', () => {
  it('orders open before done, bills first, then by due date, then oldest first', () => {
    const tasks = [
      task({ id: 'done', priority: 'critical', done: true, doneAt: TODAY }),
      task({ id: 'plain-old', priority: 'critical', createdAt: 1 }),
      task({ id: 'plain-new', priority: 'critical', createdAt: 2 }),
      task({ id: 'due-later', priority: 'critical', due: '2026-12-01' }),
      task({ id: 'due-soon', priority: 'critical', due: '2026-10-20' }),
      task({ id: 'bill-oct', billId: 'b', month: '2026-10', priority: 'critical' }),
      task({ id: 'bill-sep', billId: 'b', month: '2026-09', priority: 'critical' }),
    ];
    expect(groupTasks(tasks).critical.map((t) => t.id)).toEqual([
      'bill-sep', 'bill-oct', 'due-soon', 'due-later', 'plain-old', 'plain-new', 'done',
    ]);
  });
});

describe('createTask', () => {
  it('trims the name and drops an empty checklist', () => {
    const t = createTask({ title: '  Car wash ', priority: 'medium', due: null, items: [] }, 'id', 5);
    expect(t).toMatchObject({ title: 'Car wash', items: null, createdAt: 5 });
  });
});

describe('done and rename', () => {
  it('records the day a task was finished and clears it when reopened', () => {
    const done = toggleDone(task(), TODAY);
    expect(done).toMatchObject({ done: true, doneAt: TODAY });
    expect(toggleDone(done, TODAY)).toMatchObject({ done: false, doneAt: null });
  });

  it('ignores an empty name', () => {
    const t = task({ title: 'Car wash' });
    expect(rename(t, '   ')).toBe(t);
    expect(rename(t, ' Oil change ').title).toBe('Oil change');
  });
});

describe('checklists', () => {
  it('finishes the task when the last item is ticked, and reopens it when one is unticked', () => {
    const t = task({ items: list(true, false) });
    const finished = toggleItem(t, 1, TODAY);
    expect(finished).toMatchObject({ done: true, doneAt: TODAY });
    expect(toggleItem(finished, 0, TODAY)).toMatchObject({ done: false, doneAt: null });
  });

  it('reopens a finished task when an item is added', () => {
    const t = task({ items: list(true), done: true, doneAt: TODAY });
    expect(addItem(t, 'Eggs', TODAY)).toMatchObject({ done: false, items: [...list(true), { text: 'Eggs', done: false }] });
  });

  it('removes an item when its text is cleared', () => {
    const t = task({ items: list(false, false) });
    expect(setItemText(t, 0, '  ', TODAY).items).toEqual([{ text: 'item 1', done: false }]);
  });

  it('finishes the task when removing the only open item leaves everything ticked', () => {
    const t = task({ items: list(true, false) });
    expect(setItemText(t, 1, '', TODAY)).toMatchObject({ done: true, doneAt: TODAY });
  });

  it('turns back into a single task when the last item is removed', () => {
    expect(setItemText(task({ items: list(false) }), 0, '', TODAY).items).toBeNull();
  });
});

describe('moving up after a month', () => {
  const DAY = 86_400_000;
  const MONTH = MOVE_UP_AFTER_MS;

  it('waits a full 30 days in the same list', () => {
    const t = task({ priority: 'remaining', listSince: 0 });
    expect(moveUpIfStale(t, 29 * DAY)).toBe(t);
    expect(moveUpIfStale(t, MONTH)).toMatchObject({ priority: 'medium', listSince: MONTH });
  });

  it('catches up one list per missed month and stops at Critical', () => {
    const t = task({ priority: 'remaining', listSince: 0 });
    expect(moveUpIfStale(t, 2 * MONTH + DAY)).toMatchObject({ priority: 'high', listSince: 2 * MONTH });
    expect(moveUpIfStale(t, 10 * MONTH).priority).toBe('critical');
  });

  it('keeps the monthly rhythm from when each step was due, not from today', () => {
    const moved = moveUpIfStale(task({ priority: 'medium', listSince: 0 }), MONTH + 10 * DAY);
    expect(moveUpIfStale(moved, 2 * MONTH).priority).toBe('critical');
  });

  it('leaves monthly bills, finished tasks, and Critical tasks alone', () => {
    for (const t of [
      task({ billId: 'rent', priority: 'critical', listSince: 0 }),
      task({ done: true, doneAt: '2026-10-08', priority: 'medium', listSince: 0 }),
      task({ priority: 'critical', listSince: 0 }),
    ]) expect(moveUpIfStale(t, 5 * MONTH)).toBe(t);
  });

  it('restarts the clock when the task is moved, including back down', () => {
    const moved = moveTo(task({ priority: 'high', listSince: 0 }), 'remaining', 20 * DAY);
    expect(moved.listSince).toBe(20 * DAY);
    expect(moveUpIfStale(moved, MONTH + DAY)).toBe(moved);
  });

  it('does not restart the clock on other edits', () => {
    const renamed = rename(task({ priority: 'remaining', listSince: 0 }), 'Oil change');
    expect(moveUpIfStale(renamed, MONTH).priority).toBe('medium');
  });

  it('starts a new task\'s clock when it is added', () => {
    expect(createTask({ title: 'x', priority: 'medium', due: null, items: null }, 'id', 42).listSince).toBe(42);
  });

  it('counts only tasks that went up', () => {
    const before = [task({ id: 'a', priority: 'remaining' }), task({ id: 'b', priority: 'high' }), task({ id: 'c' })];
    const after = [task({ id: 'a', priority: 'medium' }), task({ id: 'b', priority: 'medium' }), task({ id: 'new', priority: 'critical' })];
    expect(countMovedUp(before, after)).toBe(1);
  });
});
