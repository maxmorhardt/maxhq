import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from './useInfiniteScroll';

describe('useInfiniteScroll', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls the latest callback when the sentinel intersects', () => {
    let trigger: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          trigger = cb;
        }
        observe() {}
        disconnect = disconnect;
      }
    );

    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ cb, enabled }) => {
        const ref = useInfiniteScroll<HTMLDivElement>(cb, enabled);
        ref.current = document.createElement('div');
        return ref;
      },
      { initialProps: { cb: first, enabled: false } }
    );
    expect(result.current.current).not.toBeNull();

    rerender({ cb: second, enabled: true });
    trigger?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    trigger?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('does nothing without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const cb = vi.fn();
    renderHook(() => useInfiniteScroll<HTMLDivElement>(cb, true));
    expect(cb).not.toHaveBeenCalled();
  });
});
