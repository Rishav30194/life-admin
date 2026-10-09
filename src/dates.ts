import type { ISODate, YearMonth } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date, not UTC: a task ticked at 11 pm belongs to today, not tomorrow. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthOf(date: ISODate): YearMonth {
  return date.slice(0, 7);
}

export function nextMonth(m: YearMonth): YearMonth {
  let [y = 0, mo = 0] = m.split('-').map(Number);
  mo++;
  if (mo > 12) {
    mo = 1;
    y++;
  }
  return `${y}-${pad(mo)}`;
}

export function daysInMonth(m: YearMonth): number {
  const [y = 0, mo = 0] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

function parse(date: ISODate): Date {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from `from` to `to`. Rounded so a daylight-saving hour doesn't shift it. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** "Oct", or "Oct 2027" when the month isn't in the current year. */
export function monthLabel(m: YearMonth, today: ISODate): string {
  const y = m.slice(0, 4);
  const name = MONTHS[Number(m.slice(5, 7)) - 1];
  return y === today.slice(0, 4) ? `${name}` : `${name} ${y}`;
}

export function dayLabel(date: ISODate): string {
  const d = parse(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

export function dueText(due: ISODate, today: ISODate): string {
  const n = daysBetween(today, due);
  const rel = n < 0 ? 'passed' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  return `Due ${dayLabel(due)}, ${rel}`;
}
