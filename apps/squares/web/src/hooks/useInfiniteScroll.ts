import { useEffect, useRef } from 'react';

export function useInfiniteScroll<T extends Element>(onLoadMore: () => void, enabled: boolean) {
  const sentinelRef = useRef<T | null>(null);
  const loadMore = useRef(onLoadMore);

  useEffect(() => {
    loadMore.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore.current();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
