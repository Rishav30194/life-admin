import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  /** The control on the left of the title, usually Cancel. */
  left?: ReactNode;
  /** The control on the right of the title, usually the primary action. */
  right?: ReactNode;
  onClose: () => void;
  /** Renders the sheet as a form, so the keyboard's return key submits it. */
  onSubmit?: () => void;
  children: ReactNode;
}

/** A panel that slides up from the bottom. Tapping the dimmed area or pressing Escape closes it. */
export function Sheet({ title, left, right, onClose, onSubmit, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const id = `sheet-${title.toLowerCase().replace(/\W+/g, '-')}`;
  const content = (
    <>
      <div className="grab" aria-hidden="true" />
      <div className="sheet-head">
        {left ?? <span />}
        <h2 id={id}>{title}</h2>
        {right ?? <span />}
      </div>
      {children}
    </>
  );

  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {onSubmit ? (
        <form
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={id}
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {content}
        </form>
      ) : (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id}>
          {content}
        </div>
      )}
    </div>
  );
}
