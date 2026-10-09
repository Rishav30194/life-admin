import { describe, expect, it } from 'vitest';
import { billTaskId, clearFinished, generateBills, maintain, monthsDue, renameBill } from './bills';
import { at, bill, task } from './testing';

describe('monthsDue', () => {
  it('waits for the bill day in the current month', () => {
    expect(monthsDue(bill({ day: 25 }), at('2026-10-08'))).toEqual([]);
    expect(monthsDue(bill({ day: 25 }), at('2026-10-25'))).toEqual(['2026-10']);
  });

  it('adds a bill straight away when its day this month has already passed', () => {
    expect(monthsDue(bill({ day: 1 }), at('2026-10-08'))).toEqual(['2026-10']);
  });

  it('catches up every month the app was not opened', () => {
    expect(monthsDue(bill({ lastGenerated: '2026-10' }), at('2026-12-01'))).toEqual(['2026-11', '2026-12']);
  });

  it('shows a 31st bill on the last day of a short month', () => {
    expect(monthsDue(bill({ day: 31, startMonth: '2027-02' }), at('2027-02-28'))).toEqual(['2027-02']);
  });

  it('does not add the current month early after catching up', () => {
    expect(monthsDue(bill({ day: 25, lastGenerated: '2026-10' }), at('2027-01-03'))).toEqual(['2026-11', '2026-12']);
  });
});

describe('generateBills', () => {
  it('puts a copy in Critical and records the month', () => {
    const out = generateBills({ tasks: [], bills: [bill()] }, at('2026-10-08'));
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]).toMatchObject({ id: billTaskId('rent', '2026-10'), title: 'Pay rent', billId: 'rent', month: '2026-10' });
    expect(out.bills[0]?.lastGenerated).toBe('2026-10');
  });

  it('keeps an unpaid month next to the new one', () => {
    const sep = task({ id: billTaskId('rent', '2026-09'), billId: 'rent', month: '2026-09' });
    const out = generateBills({ tasks: [sep], bills: [bill({ lastGenerated: '2026-09' })] }, at('2026-10-02'));
    expect(out.tasks.map((t) => t.month)).toEqual(['2026-09', '2026-10']);
  });

  it('does not bring back a copy you deleted', () => {
    const data = generateBills({ tasks: [], bills: [bill()] }, at('2026-10-08'));
    const deleted = { ...data, tasks: [] };
    expect(generateBills(deleted, at('2026-10-20')).tasks).toEqual([]);
  });

  it('returns the same object when nothing is due', () => {
    const data = { tasks: [], bills: [bill({ lastGenerated: '2026-10' })] };
    expect(generateBills(data, at('2026-10-20'))).toBe(data);
  });
});

describe('clearFinished', () => {
  it('keeps tasks finished today and removes ones finished earlier', () => {
    const data = {
      tasks: [
        task({ id: 'today', done: true, doneAt: '2026-10-08' }),
        task({ id: 'yesterday', done: true, doneAt: '2026-10-07' }),
        task({ id: 'open' }),
      ],
      bills: [],
    };
    expect(clearFinished(data, '2026-10-08').tasks.map((t) => t.id)).toEqual(['today', 'open']);
  });
});

describe('maintain', () => {
  it('is idempotent', () => {
    const once = maintain({ tasks: [], bills: [bill()] }, at('2026-10-08'));
    expect(maintain(once, at('2026-10-08'))).toBe(once);
  });
});

describe('renameBill', () => {
  const copy = (m: string) => task({ id: billTaskId('rent', m), title: 'Pay rent', billId: 'rent', month: m, priority: 'critical' });
  const data = { tasks: [copy('2026-09'), copy('2026-10'), task({ id: 'other', title: 'Pay rent' })], bills: [bill()] };

  it('renames the bill and every copy of it, and nothing else', () => {
    const out = renameBill(data, 'rent', '  Rent, flat 4 ');
    expect(out.bills[0]?.name).toBe('Rent, flat 4');
    expect(out.tasks.map((t) => t.title)).toEqual(['Rent, flat 4', 'Rent, flat 4', 'Pay rent']);
  });

  it('names next month\'s copy with the new name', () => {
    const out = generateBills(renameBill(data, 'rent', 'Rent'), at('2026-11-02'));
    expect(out.tasks.find((t) => t.month === '2026-11')?.title).toBe('Rent');
  });

  it('ignores an empty or unchanged name', () => {
    expect(renameBill(data, 'rent', '   ')).toBe(data);
    expect(renameBill(data, 'rent', 'Pay rent')).toBe(data);
  });
});
