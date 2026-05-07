import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  animateOnMount?: boolean;
}

export function useScrollAnimation({
  threshold = 0.18,
  rootMargin = '0px 0px -30px 0px',
  triggerOnce = true,
  animateOnMount = false,
}: UseScrollAnimationOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animateOnMount) {
      const id = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(id);
    }
  }, [animateOnMount]);

  useEffect(() => {
    if (animateOnMount) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, animateOnMount]);

  return { ref, isVisible };
}
