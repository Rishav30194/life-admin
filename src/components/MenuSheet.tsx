import { useState } from 'react';
import { ImportError, parseBackup } from '../storage';
import { LABEL, PRIORITIES, type AppData, type Priority } from '../types';
import { Sheet } from './Sheet';

interface Props {
  billCount: number;
  counts: Record<Priority, number>;
  allCollapsed: boolean;
  onBills: () => void;
  onToggleCollapse: () => void;
  onClear: (p: Priority) => void;
  onExport: () => void;
  onImport: (data: AppData) => void;
  onClose: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function MenuSheet(props: Props) {
  const { billCount, counts, allCollapsed, onBills, onToggleCollapse, onClear, onExport, onImport, onClose } = props;
  // Clearing and importing both replace data, so each takes a second tap to confirm.
  const [armedClear, setArmedClear] = useState<Priority | null>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const pickFile = async (file: File | undefined) => {
    setImportError(null);
    setPending(null);
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setImportError(err instanceof ImportError ? err.message : "Couldn't read that file.");
    }
  };

  return (
    <Sheet title="Menu" onClose={onClose} right={<button type="button" className="head-action" onClick={onClose}>Done</button>}>
      <div className="menu-group">
        <button type="button" className="menu-row" onClick={onBills}>
          <span>Monthly bills</span>
          <span className="sub">{billCount || ''}</span>
        </button>
        <button type="button" className="menu-row" onClick={onToggleCollapse}>
          <span>{allCollapsed ? 'Expand all lists' : 'Collapse all lists'}</span>
        </button>
      </div>

      <div className="label">Clear a list</div>
      <div className="menu-group">
        {PRIORITIES.map((p) => {
          const n = counts[p];
          const armed = armedClear === p;
          return (
            <button
              key={p}
              type="button"
              className={`menu-row${armed ? ' warn' : ''}`}
              disabled={n === 0}
              onClick={() => (armed ? onClear(p) : setArmedClear(p))}
            >
              <span>{armed ? `Tap again to delete ${plural(n, 'task')}` : LABEL[p]}</span>
              <span className="sub">{n ? plural(n, 'task') : 'Empty'}</span>
            </button>
          );
        })}
      </div>
      <p className="hint">Clearing deletes every task in that list. You can undo it for a few seconds afterwards.</p>

      <div className="label">Backup</div>
      <div className="menu-group">
        <button type="button" className="menu-row" onClick={onExport}>
          <span>Export a backup file</span>
        </button>
        {pending ? (
          <>
            <button type="button" className="menu-row warn" onClick={() => onImport(pending)}>
              <span>Tap to replace your list</span>
              <span className="sub">{plural(pending.tasks.length, 'task')}, {plural(pending.bills.length, 'bill')}</span>
            </button>
            <button type="button" className="menu-row" onClick={() => setPending(null)}>
              <span>Cancel import</span>
            </button>
          </>
        ) : (
          <label className="menu-row">
            <span>Import a backup file</span>
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void pickFile(e.currentTarget.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
        )}
      </div>
      {importError && <p className="hint" role="alert">{importError}</p>}
      <p className="hint">Your list is kept only on this device. Export a backup now and then, and to move to a new phone.</p>
    </Sheet>
  );
}
