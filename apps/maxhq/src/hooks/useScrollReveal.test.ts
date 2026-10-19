import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollReveal } from './useScrollReveal';

type Entry = Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>;
type ObserverCallback = (entries: Entry[]) => void;

const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

// installs a controllable IntersectionObserver and hands back the trigger
function stubObserver() {
  let callback: ObserverCallback = () => undefined;

  class MockIntersectionObserver {
    constructor(cb: ObserverCallback) {
      callback = cb;
    }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  }

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

  return {
    fire: (isIntersecting: boolean, target: Element = document.createElement('div')) =>
      act(() => callback([{ isIntersecting, target }])),
  };
}

// attaches the ref during render so the effect has an element to observe
function renderAttached(options?: Parameters<typeof useScrollReveal>[0]) {
  return renderHook(() => {
    const hook = useScrollReveal<HTMLDivElement>(options);
    hook.ref.current ??= document.createElement('div');
    return hook;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useScrollReveal', () => {
  it('reveals immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const { result } = renderAttached();

    expect(result.current.visible).toBe(true);
  });

  it('stays hidden until the element has an attached ref', () => {
    stubObserver();

    const { result } = renderHook(() => useScrollReveal<HTMLDivElement>());

    expect(result.current.visible).toBe(false);
    expect(observe).not.toHaveBeenCalled();
  });

  it('reveals when the element intersects and stops observing in once mode', () => {
    const { fire } = stubObserver();

    const { result } = renderAttached();

    expect(result.current.visible).toBe(false);
    expect(observe).toHaveBeenCalled();

    const target = document.createElement('div');
    fire(true, target);

    expect(result.current.visible).toBe(true);
    expect(unobserve).toHaveBeenCalledWith(target);
  });

  it('hides again on exit when once is false', () => {
    const { fire } = stubObserver();

    const { result } = renderAttached({ once: false });

    fire(true);
    expect(result.current.visible).toBe(true);
    expect(unobserve).not.toHaveBeenCalled();

    fire(false);
    expect(result.current.visible).toBe(false);
  });

  it('disconnects the observer on unmount', () => {
    stubObserver();

    const { unmount } = renderAttached();
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
