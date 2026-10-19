import { useEffect, useRef, useState } from 'react';

export interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLElement>({
  // threshold/rootMargin tune when an element counts as "in view"; once stops observing after the first reveal
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
  once = true,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    // nothing to observe if the ref was never attached to an element
    if (!element) {
      return;
    }

    // no IntersectionObserver (e.g. jsdom or an old browser): reveal immediately as a fallback
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);

            // in once mode, stop watching so it stays revealed
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            // when repeating, hide again as it leaves the viewport
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}
