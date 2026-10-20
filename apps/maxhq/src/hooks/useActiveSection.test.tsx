import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActiveSection } from './useActiveSection';

function Probe() {
  const active = useActiveSection(['one', 'two']);

  return (
    <>
      <section id="one" />
      <section id="two" />
      <output>{active}</output>
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useActiveSection', () => {
  it('starts on the first section', () => {
    render(<Probe />);

    expect(screen.getByRole('status')).toHaveTextContent('one');
  });

  it('follows the section crossing the viewport', () => {
    let callback: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = vi.fn();
      }
    );

    render(<Probe />);
    expect(observe).toHaveBeenCalledTimes(2);

    act(() => {
      callback(
        [
          { isIntersecting: false, target: document.getElementById('one') },
          { isIntersecting: true, target: document.getElementById('two') },
        ] as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent('two');
  });
});
