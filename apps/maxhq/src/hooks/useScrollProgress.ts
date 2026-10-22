import { useEffect, useRef } from 'react';

interface ScrollProgressOptions {
  // the viewport line, as a fraction of its height, that the element is measured against
  anchor?: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);

// writes --progress (0 to 1) onto the element as the anchor line sweeps through it, without re-rendering
export function useScrollProgress<T extends HTMLElement = HTMLElement>({
  anchor = 0.6,
}: ScrollProgressOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (prefersReducedMotion()) {
      element.style.setProperty('--progress', '1');
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const raw = (window.innerHeight * anchor - rect.top) / Math.max(rect.height, 1);
      element.style.setProperty('--progress', Math.min(Math.max(raw, 0), 1).toFixed(4));
    };

    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [anchor]);

  return ref;
}
