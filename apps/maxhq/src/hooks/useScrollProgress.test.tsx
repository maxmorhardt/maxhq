import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollProgress } from './useScrollProgress';

function Probe({ anchor }: { anchor?: number }) {
  const ref = useScrollProgress<HTMLDivElement>({ anchor });

  return <div ref={ref} data-testid="probe" />;
}

function allowMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: false, media: query }) as MediaQueryList
  );
}

function placeAt(element: HTMLElement, top: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top, height } as DOMRect);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useScrollProgress', () => {
  it('pins progress to the end under reduced motion', () => {
    render(<Probe />);

    expect(screen.getByTestId('probe').style.getPropertyValue('--progress')).toBe('1');
  });

  it('measures how far the anchor line has swept through the element', () => {
    allowMotion();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 268,
      height: 400,
    } as DOMRect);

    render(<Probe anchor={0.5} />);

    // innerHeight is 768 in jsdom, so the anchor sits at 384: (384 - 268) / 400
    expect(screen.getByTestId('probe').style.getPropertyValue('--progress')).toBe('0.2900');
  });

  it('clamps progress and updates on scroll', () => {
    allowMotion();
    let callback: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callback = cb;
      return 1;
    });

    render(<Probe anchor={0.5} />);
    const probe = screen.getByTestId('probe');

    placeAt(probe, -2000, 400);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      callback(0);
    });

    expect(probe.style.getPropertyValue('--progress')).toBe('1.0000');

    placeAt(probe, 2000, 400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      callback(0);
    });

    expect(probe.style.getPropertyValue('--progress')).toBe('0.0000');
  });

  it('stops listening once unmounted', () => {
    allowMotion();
    const remove = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<Probe />);
    unmount();

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
