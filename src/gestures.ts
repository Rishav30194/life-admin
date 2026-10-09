import type { Priority } from './types';

/**
 * Swipe and drag for a task row, written against the DOM rather than React state:
 * both run at pointer-move rate and need to move one element without re-rendering
 * the list on every frame.
 */

export interface GestureHandlers {
  /** Monthly bills always stay in Critical, so they can't be picked up. */
  canDrag: boolean;
  from: Priority;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onDrop: (target: Priority) => void;
}

const HOLD_MS = 450;
/** Movement before the hold fires cancels it, so a scroll never turns into a drag. */
const HOLD_SLOP = 6;
const AXIS_LOCK = 10;

interface Drag {
  from: Priority;
  ghost: HTMLElement;
  offY: number;
  x: number;
  y: number;
  target: Priority | null;
  raf: number;
  onDrop: (target: Priority) => void;
}

let drag: Drag | null = null;
let gestureEndedAt = 0;

// Stops the page scrolling under your finger while a task is being dragged. It has to
// be a non-passive touch listener: pointer events alone can't cancel a scroll on iOS.
document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });

function pickTarget(d: Drag) {
  const hit = document.elementFromPoint(d.x, d.y);
  const sec = hit?.closest<HTMLElement>('section.list');
  const p = (sec?.dataset['pri'] as Priority | undefined) ?? null;
  if (p === d.target) return;
  document.querySelectorAll('section.drop-target').forEach((s) => s.classList.remove('drop-target'));
  d.target = p;
  if (sec && p !== d.from) sec.classList.add('drop-target');
}

// Scrolls the page while you hold a task near the top or bottom edge, so every list is reachable.
function autoScroll() {
  if (!drag) return;
  const edge = 80;
  const h = window.innerHeight;
  const v = drag.y < edge ? -(edge - drag.y) / 5 : drag.y > h - edge ? (drag.y - (h - edge)) / 5 : 0;
  if (v) {
    window.scrollBy(0, v);
    pickTarget(drag);
  }
  drag.raf = requestAnimationFrame(autoScroll);
}

function startDrag(row: HTMLElement, h: GestureHandlers, x: number, y: number) {
  const r = row.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'list drag-ghost';
  ghost.dataset['pri'] = h.from;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.append(row.cloneNode(true));
  ghost.style.width = `${r.width}px`;
  ghost.style.left = `${r.left}px`;
  document.body.append(ghost);
  row.closest('.task')?.classList.add('drag-src');
  document.body.classList.add('dragging');
  drag = { from: h.from, ghost, offY: y - r.top, x, y, target: null, raf: 0, onDrop: h.onDrop };
  moveDrag(x, y);
  drag.raf = requestAnimationFrame(autoScroll);
}

function moveDrag(x: number, y: number) {
  if (!drag) return;
  drag.x = x;
  drag.y = y;
  drag.ghost.style.top = `${y - drag.offY}px`;
  pickTarget(drag);
}

function endDrag(drop: boolean) {
  if (!drag) return;
  const { from, target, ghost, raf, onDrop } = drag;
  cancelAnimationFrame(raf);
  drag = null;
  ghost.remove();
  document.body.classList.remove('dragging');
  document.querySelectorAll('.drop-target, .drag-src').forEach((n) => n.classList.remove('drop-target', 'drag-src'));
  if (drop && target && target !== from) onDrop(target);
}

/** Attaches swipe and hold-to-drag to a row. `handlers` is read fresh on each gesture. */
export function attachGestures(wrap: HTMLElement, row: HTMLElement, handlers: () => GestureHandlers): () => void {
  let sx = 0;
  let sy = 0;
  let pid: number | null = null;
  let mode: 'swipe' | 'drag' | null = null;
  let dx = 0;
  let hold: ReturnType<typeof setTimeout> | undefined;
  const stopHold = () => clearTimeout(hold);
  const threshold = () => Math.min(110, row.offsetWidth * 0.3);

  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // The tick box and details arrow keep their taps, and a name being typed in keeps its text selection.
    const t = e.target as Element;
    if (t.closest('input[type=checkbox], .more') || t === document.activeElement) return;
    sx = e.clientX;
    sy = e.clientY;
    pid = e.pointerId;
    mode = null;
    dx = 0;
    stopHold();
    const h = handlers();
    if (!h.canDrag) return;
    hold = setTimeout(() => {
      if (pid === null || mode) return;
      mode = 'drag';
      try { row.setPointerCapture(pid); } catch { /* the pointer is already gone */ }
      startDrag(row, h, sx, sy);
    }, HOLD_MS);
  };

  const move = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    if (mode === 'drag') {
      moveDrag(e.clientX, e.clientY);
      return;
    }
    const mx = e.clientX - sx;
    const my = e.clientY - sy;
    if (!mode) {
      if (Math.abs(mx) > HOLD_SLOP || Math.abs(my) > HOLD_SLOP) stopHold();
      if (Math.abs(mx) > AXIS_LOCK && Math.abs(mx) > Math.abs(my) * 1.2) {
        mode = 'swipe';
        row.style.transition = 'none';
        try { row.setPointerCapture(pid); } catch { /* the pointer is already gone */ }
      } else if (Math.abs(my) > AXIS_LOCK) {
        pid = null;
        return;
      } else return;
    }
    dx = mx;
    wrap.classList.toggle('to-done', dx > 0);
    wrap.classList.toggle('to-del', dx < 0);
    wrap.classList.toggle('armed', Math.abs(dx) > threshold());
    row.style.transform = `translateX(${dx}px)`;
  };

  const end = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    stopHold();
    pid = null;
    const cancelled = e.type === 'pointercancel';
    if (mode === 'drag') {
      gestureEndedAt = Date.now();
      endDrag(!cancelled);
      return;
    }
    if (mode !== 'swipe') return;
    gestureEndedAt = Date.now();
    row.style.transition = '';
    const h = handlers();
    if (!cancelled && dx > threshold()) {
      row.style.transform = '';
      wrap.classList.remove('to-done', 'to-del', 'armed');
      h.onSwipeRight();
    } else if (!cancelled && dx < -threshold()) {
      row.style.transform = 'translateX(-100%)';
      setTimeout(h.onSwipeLeft, 180);
    } else {
      row.style.transform = '';
      setTimeout(() => wrap.classList.remove('to-done', 'to-del', 'armed'), 200);
    }
  };

  // A swipe or drag ends with a click on the name; this keeps it from also starting a rename.
  const click = (e: MouseEvent) => {
    if (Date.now() - gestureEndedAt < 350) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  row.addEventListener('pointerdown', down);
  row.addEventListener('pointermove', move);
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  row.addEventListener('click', click, true);
  return () => {
    stopHold();
    row.removeEventListener('pointerdown', down);
    row.removeEventListener('pointermove', move);
    row.removeEventListener('pointerup', end);
    row.removeEventListener('pointercancel', end);
    row.removeEventListener('click', click, true);
  };
}
