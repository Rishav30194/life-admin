import { useRef, useState } from 'react';
import { ordinal } from '../dates';
import type { Bill } from '../types';
import { Sheet } from './Sheet';

interface Props {
  bills: Bill[];
  onAdd: (name: string, day: number) => void;
  onChangeDay: (id: string, day: number) => void;
  onStop: (id: string) => void;
  onClose: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function DaySelect({ value, label, onChange }: { value: number; label: string; onChange: (day: number) => void }) {
  return (
    <select className="field day-sel" value={value} aria-label={label} onChange={(e) => onChange(Number(e.currentTarget.value))}>
      {DAYS.map((d) => <option key={d} value={d}>{ordinal(d)}</option>)}
    </select>
  );
}

export function BillsSheet({ bills, onAdd, onChangeDay, onStop, onClose }: Props) {
  const [armed, setArmed] = useState<string | null>(null);
  const [day, setDay] = useState(1);
  const nameRef = useRef<HTMLInputElement>(null);
  const sorted = [...bills].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Sheet title="Monthly bills" onClose={onClose} right={<button type="button" className="head-action" onClick={onClose}>Done</button>}>
      <p className="hint">Each bill appears at the top of Critical on its day every month and stays there until you mark it paid.</p>
      <ul className="bill-list">
        {sorted.length === 0 && <li className="hint">No bills yet. Add one for each credit card, and rent.</li>}
        {sorted.map((b) => (
          <li key={b.id}>
            <span className="bill-name">{b.name}</span>
            <DaySelect value={b.day} label={`Day of the month for ${b.name}`} onChange={(d) => onChangeDay(b.id, d)} />
            <button
              type="button"
              className={`pill${armed === b.id ? ' warn' : ''}`}
              onClick={() => (armed === b.id ? onStop(b.id) : setArmed(b.id))}
            >
              {armed === b.id ? 'Tap again to stop' : 'Stop'}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="add-line"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          const name = nameRef.current?.value.trim();
          if (!name || !nameRef.current) return;
          onAdd(name, day);
          nameRef.current.value = '';
          setDay(1);
        }}
      >
        <input ref={nameRef} className="field" placeholder="For example Rent" aria-label="Bill name" />
        <DaySelect value={day} label="Day of the month" onChange={setDay} />
        <button type="submit" className="primary">Add</button>
      </form>
    </Sheet>
  );
}
