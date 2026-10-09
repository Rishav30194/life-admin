import { daysInMonth, monthOf, nextMonth, toISODate } from './dates';
import type { AppData, Bill, ISODate, Task, YearMonth } from './types';

/** The day a bill appears in month `m`. A bill set for the 31st shows on the last day of shorter months. */
export function showDay(bill: Bill, m: YearMonth): number {
  return Math.min(bill.day, daysInMonth(m));
}

/**
 * Every month this bill is owed a copy for, as of `now`, oldest first.
 *
 * Months are caught up rather than skipped: if the app isn't opened for all of
 * November, opening it in December still adds November's bill, so a missed payment
 * can't disappear. The current month counts only once its day has arrived.
 */
export function monthsDue(bill: Bill, now: Date): YearMonth[] {
  const cur = monthOf(toISODate(now));
  const out: YearMonth[] = [];
  for (let m = bill.lastGenerated ? nextMonth(bill.lastGenerated) : bill.startMonth; m <= cur; m = nextMonth(m)) {
    if (m === cur && now.getDate() < showDay(bill, m)) break;
    out.push(m);
  }
  return out;
}

export const billTaskId = (billId: string, m: YearMonth) => `bill-${billId}-${m}`;

export function billTask(bill: Bill, m: YearMonth, createdAt: number): Task {
  return {
    id: billTaskId(bill.id, m),
    title: bill.name,
    priority: 'critical',
    due: null,
    items: null,
    done: false,
    doneAt: null,
    createdAt,
    billId: bill.id,
    month: m,
  };
}

/** Adds each bill's missing monthly copies and records how far each bill has got. */
export function generateBills(data: AppData, now: Date): AppData {
  const ids = new Set(data.tasks.map((t) => t.id));
  const added: Task[] = [];
  const bills = data.bills.map((bill) => {
    const months = monthsDue(bill, now);
    if (!months.length) return bill;
    for (const m of months) {
      const task = billTask(bill, m, now.getTime());
      // A copy you deleted stays deleted: lastGenerated has already moved past it.
      if (!ids.has(task.id)) added.push(task);
    }
    return { ...bill, lastGenerated: months[months.length - 1] ?? bill.lastGenerated };
  });
  if (!added.length && bills.every((b, i) => b === data.bills[i])) return data;
  return { tasks: [...data.tasks, ...added], bills };
}

/** Finished tasks stay struck through for the day they were done, then go. */
export function clearFinished(data: AppData, today: ISODate): AppData {
  const tasks = data.tasks.filter((t) => !(t.done && t.doneAt !== null && t.doneAt < today));
  return tasks.length === data.tasks.length ? data : { ...data, tasks };
}

/** What opening the app (or a new day starting while it's open) does. Idempotent. */
export function maintain(data: AppData, now: Date): AppData {
  return clearFinished(generateBills(data, now), toISODate(now));
}
