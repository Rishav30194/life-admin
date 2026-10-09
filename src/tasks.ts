import { PRIORITIES } from './types';
import type { ChecklistItem, ISODate, Priority, Task } from './types';

/** Monthly bills always sit in Critical; every other task sits where you put it. */
export function priorityOf(t: Task): Priority {
  return t.billId ? 'critical' : t.priority;
}

/**
 * A monthly bill's copy is never deleted by hand, only ticked off, so a bill can't be
 * dismissed without being paid. It clears itself the day after it's ticked, like any task.
 */
export function canDelete(t: Task): boolean {
  return !t.billId;
}

/** Open before done, bills first, then by due date, then oldest first. */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (!!a.billId !== !!b.billId) return a.billId ? -1 : 1;
  if (a.billId && b.billId) return `${a.month}${a.title}`.localeCompare(`${b.month}${b.title}`);
  if (!!a.due !== !!b.due) return a.due ? -1 : 1;
  if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
  return a.createdAt - b.createdAt;
}

export function groupTasks(tasks: readonly Task[]): Record<Priority, Task[]> {
  const groups = Object.fromEntries(PRIORITIES.map((p) => [p, [] as Task[]])) as Record<Priority, Task[]>;
  for (const t of tasks) groups[priorityOf(t)].push(t);
  for (const p of PRIORITIES) groups[p].sort(compareTasks);
  return groups;
}

export interface NewTask {
  title: string;
  priority: Priority;
  due: ISODate | null;
  items: string[] | null;
}

export function createTask(input: NewTask, id: string, now: number): Task {
  const items = input.items?.map((text) => ({ text, done: false })) ?? null;
  return {
    id,
    title: input.title.trim(),
    priority: input.priority,
    due: input.due,
    items: items?.length ? items : null,
    done: false,
    doneAt: null,
    createdAt: now,
    billId: null,
    month: null,
  };
}

export function toggleDone(t: Task, today: ISODate): Task {
  return t.done ? { ...t, done: false, doneAt: null } : { ...t, done: true, doneAt: today };
}

/** An empty name is ignored rather than saved: the old name stays. */
export function rename(t: Task, title: string): Task {
  const v = title.trim();
  return v && v !== t.title ? { ...t, title: v } : t;
}

/** A bill keeps to Critical whatever it's dropped on. */
export function moveTo(t: Task, p: Priority): Task {
  return t.billId || t.priority === p ? t : { ...t, priority: p };
}

export function setDue(t: Task, due: ISODate | null): Task {
  return { ...t, due };
}

/**
 * Applies a checklist change and keeps the task's own tick in step with it:
 * ticking the last item finishes the task, unticking any item reopens it.
 */
function withItems(t: Task, items: ChecklistItem[], today: ISODate): Task {
  if (!items.length) return { ...t, items: null };
  const all = items.every((x) => x.done);
  if (all && !t.done) return { ...t, items, done: true, doneAt: today };
  if (!all && t.done) return { ...t, items, done: false, doneAt: null };
  return { ...t, items };
}

export function toggleItem(t: Task, i: number, today: ISODate): Task {
  if (!t.items?.[i]) return t;
  return withItems(t, t.items.map((it, j) => (j === i ? { ...it, done: !it.done } : it)), today);
}

export function addItem(t: Task, text: string, today: ISODate): Task {
  const v = text.trim();
  if (!v) return t;
  return withItems(t, [...(t.items ?? []), { text: v, done: false }], today);
}

/** Clearing an item's text removes the item. */
export function setItemText(t: Task, i: number, text: string, today: ISODate): Task {
  const item = t.items?.[i];
  if (!t.items || !item) return t;
  const v = text.trim();
  if (!v) return withItems(t, t.items.filter((_, j) => j !== i), today);
  return v === item.text ? t : { ...t, items: t.items.map((it, j) => (j === i ? { ...it, text: v } : it)) };
}
