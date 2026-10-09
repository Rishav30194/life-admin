import { useEffect, useRef, type ReactNode } from 'react';

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

/** How far down, as a share of the sheet's height, a drag must go to close it. */
const CLOSE_SHARE = 0.3;
const CLOSE_MAX_PX = 120;
/** A quick flick closes it from a shorter drag. In px per ms. */
const FLICK_SPEED = 0.6;
const AXIS_LOCK = 8;

/**
 * A panel that slides up from the bottom. Swiping it down, tapping the dimmed area, or
 * pressing Escape closes it.
 */
export function Sheet({ title, left, right, onClose, onSubmit, children }: Props) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Swipe down to close. Touch events rather than pointer events, because only a
  // non-passive touchmove can stop iOS scrolling the sheet while it follows the finger.
  useEffect(() => {
    const sheet = sheetRef.current;
    const scrim = scrimRef.current;
    if (!sheet || !scrim) return;
    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let dy = 0;
    let tracking = false;
    let dragging = false;

    const reset = () => {
      sheet.style.transition = 'transform 0.2s ease-out';
      scrim.style.transition = 'background-color 0.2s ease-out';
      sheet.style.transform = '';
      scrim.style.backgroundColor = '';
    };

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return;
      const target = e.target as Element;
      // Fields keep their own touches: text selection, the date picker, dropdowns.
      if (target.closest('input, textarea, select')) return;
      // Scrolled-down content scrolls back up first; the header always drags.
      if (sheet.scrollTop > 0 && !target.closest('.sheet-head, .grab')) return;
      startX = t.clientX;
      startY = t.clientY;
      startedAt = performance.now();
      dy = 0;
      tracking = true;
      dragging = false;
    };

    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!tracking || !t) return;
      const my = t.clientY - startY;
      const mx = t.clientX - startX;
      if (!dragging) {
        if (Math.abs(my) < AXIS_LOCK && Math.abs(mx) < AXIS_LOCK) return;
        // Upward or sideways movement is a scroll or a swipe on something else, not a close.
        if (my <= 0 || Math.abs(mx) > Math.abs(my)) {
          tracking = false;
          return;
        }
        dragging = true;
        sheet.style.transition = 'none';
        scrim.style.transition = 'none';
      }
      e.preventDefault();
      dy = Math.max(0, my);
      sheet.style.transform = `translateY(${dy}px)`;
      // The dimming fades as the sheet goes, so the list underneath shows through.
      const left = Math.max(0, 1 - dy / sheet.offsetHeight);
      scrim.style.backgroundColor = `color-mix(in srgb, var(--scrim) ${Math.round(left * 100)}%, transparent)`;
    };

    const end = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;
      const speed = dy / Math.max(1, performance.now() - startedAt);
      if (dy > Math.min(CLOSE_MAX_PX, sheet.offsetHeight * CLOSE_SHARE) || (speed > FLICK_SPEED && dy > 30)) {
        sheet.style.transition = 'transform 0.18s ease-in';
        sheet.style.transform = 'translateY(100%)';
        scrim.style.transition = 'background-color 0.18s ease-in';
        scrim.style.backgroundColor = 'transparent';
        setTimeout(() => closeRef.current(), 170);
      } else {
        reset();
      }
    };

    sheet.addEventListener('touchstart', start, { passive: true });
    sheet.addEventListener('touchmove', move, { passive: false });
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);
    return () => {
      sheet.removeEventListener('touchstart', start);
      sheet.removeEventListener('touchmove', move);
      sheet.removeEventListener('touchend', end);
      sheet.removeEventListener('touchcancel', end);
    };
  }, []);

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
    <div ref={scrimRef} className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {onSubmit ? (
        <form
          ref={(el) => { sheetRef.current = el; }}
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
        <div
          ref={(el) => { sheetRef.current = el; }}
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={id}
        >
          {content}
        </div>
      )}
    </div>
  );
}
