import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useScrollAnimation } from './useScrollAnimation';
import { createElement } from 'react';

// Test component that attaches the ref to a real DOM element
function TestComponent(props: { threshold?: number; rootMargin?: string; triggerOnce?: boolean }) {
  const { ref, isVisible } = useScrollAnimation(props);
  return createElement('div', { ref, 'data-testid': 'target', 'data-visible': String(isVisible) });
}

describe('useScrollAnimation', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let intersectionCallback: IntersectionObserverCallback;
  let lastConstructorOptions: IntersectionObserverInit | undefined;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          intersectionCallback = callback;
          lastConstructorOptions = options;
        }
        observe = observeMock;
        unobserve = unobserveMock;
        disconnect = disconnectMock;
        root = null;
        rootMargin = '';
        thresholds: number[] = [];
        takeRecords = vi.fn();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should start with isVisible=false', () => {
    const { getByTestId } = render(createElement(TestComponent));
    expect(getByTestId('target').dataset.visible).toBe('false');
  });

  it('should observe the element on mount', () => {
    render(createElement(TestComponent));
    expect(observeMock).toHaveBeenCalled();
  });

  it('should set isVisible to true when element intersects', () => {
    const { getByTestId } = render(createElement(TestComponent));
    const target = getByTestId('target');

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(target.dataset.visible).toBe('true');
  });

  it('should unobserve after intersection when triggerOnce is true', () => {
    const { getByTestId } = render(createElement(TestComponent, { triggerOnce: true }));
    const target = getByTestId('target');

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        { unobserve: unobserveMock } as unknown as IntersectionObserver
      );
    });

    expect(unobserveMock).toHaveBeenCalled();
  });

  it('should toggle visibility when triggerOnce is false', () => {
    const { getByTestId } = render(createElement(TestComponent, { triggerOnce: false }));
    const target = getByTestId('target');

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(target.dataset.visible).toBe('true');

    act(() => {
      intersectionCallback(
        [{ isIntersecting: false, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(target.dataset.visible).toBe('false');
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = render(createElement(TestComponent));
    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should use custom threshold and rootMargin', () => {
    render(createElement(TestComponent, { threshold: 0.5, rootMargin: '10px' }));

    expect(lastConstructorOptions).toEqual({
      threshold: 0.5,
      rootMargin: '10px',
    });
  });
});
