import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { generateBills, maintain } from './bills';
import { AddSheet } from './components/AddSheet';
import { BillsSheet } from './components/BillsSheet';
import { MenuSheet } from './components/MenuSheet';
import { TaskRow } from './components/TaskRow';
import { monthOf, toISODate } from './dates';
import {
  StorageWriteError, exportBackup, load, loadCollapsed, requestPersistence, save, saveCollapsed,
} from './storage';
import { createTask, groupTasks, moveTo, type NewTask } from './tasks';
import { LABEL, PRIORITIES, type AppData, type Bill, type Priority, type Task } from './types';

type SheetName = 'add' | 'menu' | 'bills';

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

/**
 * One screen; the add, menu and bills panels open over it. No router: the app runs
 * standalone, where there is no back button and nothing to deep-link to.
 */
export function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [today, setToday] = useState(() => toISODate(new Date()));
  // Bills and the day's cleanup run before the first paint, so the list never jumps.
  const [data, setData] = useState<AppData>(() => maintain(load(), new Date()));
  const [collapsed, setCollapsed] = useState<Set<Priority>>(() => new Set(loadCollapsed()));
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((text: string, undo?: () => void) => {
    setToast({ id: Date.now(), text, ...(undo ? { undo } : {}) });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    try {
      save(data);
    } catch (err) {
      if (!(err instanceof StorageWriteError)) throw err;
      showToast(err.message);
    }
  }, [data, showToast]);

  useEffect(() => saveCollapsed(collapsed), [collapsed]);
  useEffect(() => requestPersistence(), []);

  // A new day or month can start while the app sits open or in the background.
  // maintain returns the same object when nothing is due, so this is free most minutes.
  useEffect(() => {
    const check = () => {
      const now = new Date();
      setToday(toISODate(now));
      setData((d) => maintain(d, now));
    };
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  const groups = useMemo(() => groupTasks(data.tasks), [data.tasks]);
  const billDays = useMemo(() => new Map(data.bills.map((b) => [b.id, b.day])), [data.bills]);

  const restore = (tasks: Task[]) =>
    setData((d) => {
      const ids = new Set(d.tasks.map((t) => t.id));
      const back = tasks.filter((t) => !ids.has(t.id));
      return back.length ? { ...d, tasks: [...d.tasks, ...back] } : d;
    });

  const removeTasks = (ids: Set<string>) => {
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => !ids.has(t.id)) }));
    setOpen((o) => new Set([...o].filter((id) => !ids.has(id))));
  };

  const updateTask = (id: string, fn: (t: Task) => Task) =>
    setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) }));

  const deleteTask = (t: Task) => {
    removeTasks(new Set([t.id]));
    showToast(`Deleted "${t.title}"`, () => restore([t]));
  };

  const moveTask = (id: string, to: Priority) => {
    updateTask(id, (t) => moveTo(t, to));
    showToast(`Moved to ${LABEL[to]}`);
  };

  const clearList = (p: Priority) => {
    const gone = groups[p];
    removeTasks(new Set(gone.map((t) => t.id)));
    setSheet(null);
    showToast(`Cleared ${gone.length} ${gone.length === 1 ? 'task' : 'tasks'} from ${LABEL[p]}`, () => restore(gone));
  };

  const addTask = (input: NewTask) => {
    const task = createTask(input, crypto.randomUUID(), Date.now());
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
    setCollapsed((c) => new Set([...c].filter((p) => p !== input.priority)));
    setSheet(null);
  };

  const addBill = (name: string, day: number) => {
    const now = new Date();
    const bill: Bill = {
      id: crypto.randomUUID(), name, day, startMonth: monthOf(toISODate(now)), lastGenerated: null, createdAt: now.getTime(),
    };
    setData((d) => generateBills({ ...d, bills: [...d.bills, bill] }, now));
  };

  const changeBillDay = (id: string, day: number) =>
    setData((d) => generateBills({ ...d, bills: d.bills.map((b) => (b.id === id ? { ...b, day } : b)) }, new Date()));

  // Stopping a bill ends future months. A copy already in Critical stays until it's paid.
  const stopBill = (id: string) => setData((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) }));

  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportBackup(data, new Date())], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-admin-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = (next: AppData) => {
    setData(maintain(next, new Date()));
    setOpen(new Set());
    setSheet(null);
    showToast(`Imported ${next.tasks.length} tasks and ${next.bills.length} bills`);
  };

  const toggleSection = (p: Priority) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const allCollapsed = PRIORITIES.every((p) => collapsed.has(p));
  const openCount = (p: Priority) => groups[p].filter((t) => !t.done).length;
  const totalOpen = PRIORITIES.reduce((s, p) => s + openCount(p), 0);
  const critOpen = openCount('critical');
  const now = new Date(`${today}T12:00:00`);

  return (
    <>
      <div className="wrap">
        <header>
          <div className="top">
            <span className="month">{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="icon-btn" onClick={() => setSheet('menu')}>Menu</button>
          </div>
          <h1 className="day">{now.toLocaleDateString(undefined, { weekday: 'long' })} {now.getDate()}</h1>
          <div className="summary">
            {critOpen ? <b>{critOpen} critical</b> : 'Nothing critical'} · {totalOpen} open
          </div>
        </header>

        <div className="lists">
          {PRIORITIES.map((p) => {
            const isCollapsed = collapsed.has(p);
            return (
              <section key={p} className={`list${isCollapsed ? ' collapsed' : ''}`} data-pri={p} aria-label={LABEL[p]}>
                <h2 className="sec-head">
                  <button type="button" className="sec-btn" aria-expanded={!isCollapsed} onClick={() => toggleSection(p)}>
                    <span>{LABEL[p]}</span>
                    <span className="sec-right">
                      <span className="count">{openCount(p)}</span>
                      <span className="chev" aria-hidden="true" />
                    </span>
                  </button>
                </h2>
                {!isCollapsed && (
                  <ul className="tasks">
                    {groups[p].length === 0 && (
                      <li className="empty">
                        {p === 'critical' ? 'All clear. Bills land here on their day each month.' : 'Nothing here.'}
                      </li>
                    )}
                    {groups[p].map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        billDay={t.billId ? (billDays.get(t.billId) ?? null) : null}
                        open={open.has(t.id)}
                        onToggleOpen={() =>
                          setOpen((o) => {
                            const n = new Set(o);
                            if (n.has(t.id)) n.delete(t.id);
                            else n.add(t.id);
                            return n;
                          })
                        }
                        onUpdate={(fn) => updateTask(t.id, fn)}
                        onDelete={() => deleteTask(t)}
                        onMove={(to) => moveTask(t.id, to)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Add a task"
        onClick={() => {
          // Rendering the sheet synchronously lets the focus happen inside this tap,
          // which is the only way iOS will raise the keyboard.
          flushSync(() => setSheet('add'));
          titleRef.current?.focus();
        }}
      >
        +
      </button>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {sheet === 'add' && <AddSheet titleRef={titleRef} onAdd={addTask} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <MenuSheet
          billCount={data.bills.length}
          counts={Object.fromEntries(PRIORITIES.map((p) => [p, groups[p].length])) as Record<Priority, number>}
          allCollapsed={allCollapsed}
          onBills={() => setSheet('bills')}
          onToggleCollapse={() => {
            setCollapsed(allCollapsed ? new Set() : new Set(PRIORITIES));
            setSheet(null);
          }}
          onClear={clearList}
          onExport={exportData}
          onImport={importData}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'bills' && (
        <BillsSheet
          bills={data.bills}
          onAdd={addBill}
          onChangeDay={changeBillDay}
          onStop={stopBill}
          onClose={() => setSheet(null)}
        />
      )}

      {needRefresh && (
        <div className="update" role="status">
          <span>A new version is ready.</span>
          <button type="button" onClick={() => void updateServiceWorker(true)}>Reload</button>
        </div>
      )}
    </>
  );
}
