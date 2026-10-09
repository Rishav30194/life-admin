import { useRef, useState, type RefObject } from 'react';
import type { NewTask } from '../tasks';
import { LABEL, PRIORITIES, type Priority } from '../types';
import { Sheet } from './Sheet';

interface Props {
  /** Focused by the caller inside the tap that opens the sheet, so iOS raises the keyboard. */
  titleRef: RefObject<HTMLInputElement | null>;
  onAdd: (input: NewTask) => void;
  onClose: () => void;
}

export function AddSheet({ titleRef, onAdd, onClose }: Props) {
  const [priority, setPriority] = useState<Priority>('high');
  const [checklist, setChecklist] = useState(false);
  const itemsRef = useRef<HTMLTextAreaElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const title = titleRef.current?.value.trim() ?? '';
    if (!title) {
      titleRef.current?.focus();
      return;
    }
    let items: string[] | null = null;
    if (checklist) {
      items = (itemsRef.current?.value ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (!items.length) {
        itemsRef.current?.focus();
        return;
      }
    }
    onAdd({ title, priority, due: dueRef.current?.value || null, items });
  };

  return (
    <Sheet
      title="New task"
      onClose={onClose}
      onSubmit={submit}
      left={<button type="button" className="close" onClick={onClose}>Cancel</button>}
      right={<button type="submit" className="head-action">Add</button>}
    >
      <input ref={titleRef} className="field" placeholder="What needs doing?" aria-label="Task" enterKeyHint="done" />
      <div className="label">List</div>
      <div className="seg" role="radiogroup" aria-label="List">
        {PRIORITIES.map((p) => (
          <span key={p} data-pri={p}>
            <input type="radio" name="add-pri" id={`add-pri-${p}`} checked={priority === p} onChange={() => setPriority(p)} />
            <label htmlFor={`add-pri-${p}`}>{LABEL[p]}</label>
          </span>
        ))}
      </div>
      <div className="opts">
        <label className="date-wrap">
          Due <input ref={dueRef} type="date" />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.currentTarget.checked)} /> Checklist
        </label>
      </div>
      {checklist && (
        <textarea
          ref={itemsRef}
          className="field"
          placeholder={'One item per line\nMilk\nEggs\nRice'}
          aria-label="Checklist items"
        />
      )}
    </Sheet>
  );
}
