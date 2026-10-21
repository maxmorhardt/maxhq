import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import LandingPlaybook from './LandingPlaybook';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LandingPlaybook', () => {
  it('renders every step in order', () => {
    renderWithProviders(<LandingPlaybook />);

    const steps = screen.getAllByRole('listitem');
    expect(steps.map((step) => step.querySelector('h3')?.textContent)).toEqual([
      'Set up the board',
      'Claim your squares',
      'Numbers are drawn',
      'Winners light up',
    ]);
  });

  it('starts on the first step without an observer', () => {
    renderWithProviders(<LandingPlaybook />);

    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
  });

  it('follows the step crossing the middle of the screen', () => {
    let callback: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );

    renderWithProviders(<LandingPlaybook />);
    const steps = screen.getAllByRole('listitem');

    act(() => {
      callback(
        [
          { isIntersecting: false, target: steps[0] },
          { isIntersecting: true, target: steps[2] },
        ] as unknown as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    });

    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).not.toHaveAttribute('aria-current');
  });
});
