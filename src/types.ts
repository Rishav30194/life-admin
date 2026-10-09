export type Priority = 'critical' | 'high' | 'medium' | 'remaining';

/** Display order, most urgent first. */
export const PRIORITIES: readonly Priority[] = ['critical', 'high', 'medium', 'remaining'];

export const LABEL: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  remaining: 'Remaining',
};

/** A local calendar date, `YYYY-MM-DD`. */
export type ISODate = string;
/** A local calendar month, `YYYY-MM`. */
export type YearMonth = string;

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  due: ISODate | null;
  /** Null for a single task. A checklist is chosen when the task is added. */
  items: ChecklistItem[] | null;
  done: boolean;
  /** The day it was ticked off. It stays visible, struck through, until that day ends. */
  doneAt: ISODate | null;
  createdAt: number;
  /** Set on the copy a monthly bill puts into Critical. */
  billId: string | null;
  month: YearMonth | null;
}

export interface Bill {
  id: string;
  name: string;
  /** Day of the month it appears, 1–31. Clamped to the month's last day. */
  day: number;
  startMonth: YearMonth;
  /** The latest month a copy was created for, or null before the first one. */
  lastGenerated: YearMonth | null;
  createdAt: number;
}

export interface AppData {
  tasks: Task[];
  bills: Bill[];
}
