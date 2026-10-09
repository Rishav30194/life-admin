import { describe, expect, it } from 'vitest';
import { daysBetween, daysInMonth, dueText, monthLabel, nextMonth, ordinal, toISODate } from './dates';

describe('dates', () => {
  it('uses the local date, not UTC', () => {
    expect(toISODate(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });

  it('rolls December into January', () => {
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(nextMonth('2026-09')).toBe('2026-10');
  });

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth('2027-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });

  it('counts whole days across a daylight-saving change', () => {
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('adds the year to month labels only outside the current year', () => {
    expect(monthLabel('2026-10', '2026-10-08')).toBe('Oct');
    expect(monthLabel('2027-01', '2026-10-08')).toBe('Jan 2027');
  });

  it('writes ordinals, teens included', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 25, 31].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '25th', '31st',
    ]);
  });

  it('describes due dates relative to today', () => {
    expect(dueText('2026-10-20', '2026-10-08')).toBe('Due Oct 20, in 12 days');
    expect(dueText('2026-10-09', '2026-10-08')).toBe('Due Oct 9, tomorrow');
    expect(dueText('2026-10-08', '2026-10-08')).toBe('Due Oct 8, today');
    expect(dueText('2026-10-01', '2026-10-08')).toBe('Due Oct 1, passed');
  });
});
