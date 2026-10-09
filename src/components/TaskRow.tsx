import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { dueText, monthLabel, ordinal } from '../dates';
import { attachGestures, type GestureHandlers } from '../gestures';
import { addItem, priorityOf, rename, setDue, setItemText, toggleDone, toggleItem } from '../tasks';
import type { ISODate, Priority, Task } from '../types';

interface Props {
  task: Task;
  today: ISODate;
  /** The bill's day of the month, for a monthly bill's copy. */
  billDay: number | null;
  open: boolean;
  onToggleOpen: () => void;
  /** Takes an updater, so a change is applied to the latest copy of the task. */
  onUpdate: (fn: (t: Task) => Task) => void;
  onDelete: () => void;
  onMove: (to: Priority) => void;
}

export function TaskRow({ task: t, today, billDay, open, onToggleOpen, onUpdate, onDelete, onMove }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const [renaming, setRenaming] = useState(false);

  // Gestures are attached once and read the latest props through this ref.
  const handlers = useRef<GestureHandlers | null>(null);
  handlers.current = {
    canDrag: !t.billId,
    from: priorityOf(t),
    onSwipeRight: () => onUpdate((x) => toggleDone(x, today)),
    onSwipeLeft: onDelete,
    onDrop: onMove,
  };
  useEffect(() => {
    const wrap = wrapRef.current;
    const row = rowRef.current;
    if (!wrap || !row) return;
    return attachGestures(wrap, row, () => handlers.current as GestureHandlers);
  }, []);

  // The name is plain text so you can hold it to drag. Tapping swaps in a text box and
  // focuses it within the same tap, which is what lets iOS raise the keyboard straight away.
  const startRename = () => {
    flushSync(() => setRenaming(true));
    const box = nameRef.current;
    if (!box) return;
    autoSize(box);
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  };

  const finishRename = () => {
    const box = nameRef.current;
    if (box) {
      const value = box.value;
      onUpdate((x) => rename(x, value));
    }
    setRenaming(false);
  };

  const items = t.items ?? [];
  const doneCount = items.filter((x) => x.done).length;
  const meta: string[] = [];
  if (t.billId && t.month) meta.push(`Monthly bill · ${monthLabel(t.month, today)}${billDay && billDay > 1 ? ` · ${ordinal(billDay)}` : ''}`);
  if (t.due) meta.push(dueText(t.due, today));
  if (items.length) meta.push(`${doneCount} of ${items.length}`);
  if (t.done) meta.push('Done · clears tomorrow');

  return (
    <li className={`task${t.done ? ' done' : ''}`}>
      <div className="swipe" ref={wrapRef}>
        <div className="swipe-bg" aria-hidden="true">
          <span className="sw-done">{t.done ? 'Not done' : 'Done'}</span>
          <span className="sw-del">Delete</span>
        </div>
        <div className="row" ref={rowRef}>
          <input
            type="checkbox"
            className="tick"
            checked={t.done}
            onChange={() => onUpdate((x) => toggleDone(x, today))}
            aria-label={`${t.done ? 'Mark not done' : 'Mark done'}: ${t.title}`}
          />
          <div className="title-col">
            {t.billId ? (
              // A bill's copy takes its name from the bill, so it isn't renamed here.
              <span className="title">{t.title}</span>
            ) : renaming ? (
              <textarea
                ref={nameRef}
                className="row-title"
                rows={1}
                defaultValue={t.title}
                aria-label="Task name"
                enterKeyHint="done"
                onInput={(e) => autoSize(e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={finishRename}
              />
            ) : (
              <span
                className="title editable"
                role="button"
                tabIndex={0}
                aria-label={`Rename ${t.title}`}
                onClick={startRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    startRename();
                  }
                }}
              >
                {t.title}
              </span>
            )}
            {meta.length > 0 && (
              <span className="meta">
                {meta.map((m) => <span key={m}>{m}</span>)}
              </span>
            )}
            {items.length > 0 && !t.done && (
              <span className="progress">
                <i style={{ width: `${Math.round((100 * doneCount) / items.length)}%` }} />
              </span>
            )}
          </div>
          {!t.billId && (
            <button
              type="button"
              className="more"
              aria-expanded={open}
              aria-label={`${open ? 'Hide' : 'Show'} details for ${t.title}`}
              onClick={onToggleOpen}
            />
          )}
        </div>
      </div>
      {open && !t.billId && <Details task={t} today={today} onUpdate={onUpdate} />}
    </li>
  );
}

function Details({ task: t, today, onUpdate }: { task: Task; today: ISODate; onUpdate: Props['onUpdate'] }) {
  const items = t.items ?? [];
  return (
    <div className="detail">
      {items.length > 0 && (
        <>
          <ul className="items">
            {items.map((it, i) => (
              // Keyed by text so an outside change resets the uncontrolled field.
              <li key={`${i}:${it.text}`} className={`item${it.done ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  className="tick"
                  checked={it.done}
                  onChange={() => onUpdate((x) => toggleItem(x, i, today))}
                  aria-label={`Tick off ${it.text}`}
                />
                <input
                  className="inline"
                  defaultValue={it.text}
                  aria-label="Checklist item"
                  enterKeyHint="done"
                  onKeyDown={blurOnEnter}
                  onBlur={(e) => {
                    const value = e.currentTarget.value;
                    onUpdate((x) => setItemText(x, i, value, today));
                  }}
                />
              </li>
            ))}
          </ul>
          <input
            className="inline"
            placeholder="+ Add item"
            aria-label="Add checklist item"
            enterKeyHint="enter"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              // The field stays focused, so the keyboard stays up for the next item.
              const value = e.currentTarget.value;
              onUpdate((x) => addItem(x, value, today));
              e.currentTarget.value = '';
            }}
          />
          <p className="dhint">Clear an item's text to remove it.</p>
        </>
      )}
      <div className="dfields">
        <label>
          <span className="dlabel">Due</span>
          <input
            type="date"
            className="field"
            value={t.due ?? ''}
            onChange={(e) => {
              const value = e.currentTarget.value || null;
              onUpdate((x) => setDue(x, value));
            }}
          />
        </label>
      </div>
    </div>
  );
}

function blurOnEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') {
    e.preventDefault();
    e.currentTarget.blur();
  }
}

/** Grows the name onto more lines instead of cutting it off. */
function autoSize(box: HTMLTextAreaElement) {
  box.style.height = 'auto';
  box.style.height = `${box.scrollHeight}px`;
}
