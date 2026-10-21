import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlatformStack from './PlatformStack';
import { renderWithProviders } from '../../testUtils';

const reducedMotion = window.matchMedia;

describe('PlatformStack', () => {
  afterEach(() => {
    window.matchMedia = reducedMotion;
  });

  it('describes the stack and labels every layer', () => {
    renderWithProviders(<PlatformStack />);

    expect(
      screen.getByRole('img', { name: /interface, API, infrastructure, and monitoring/ })
    ).toBeInTheDocument();
    for (const label of ['01 interface', '02 api', '03 infra', '04 monitoring']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('lists the skills on each layer', () => {
    renderWithProviders(<PlatformStack />);

    for (const skill of ['React', 'Angular', 'Spring Boot', 'Go', 'Kubernetes', 'Grafana']) {
      expect(screen.getByText(skill)).toBeInTheDocument();
    }
  });

  it('stays still under reduced motion', () => {
    renderWithProviders(<PlatformStack />);
    const scene = screen.getByRole('img').firstElementChild as HTMLElement;

    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 });
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('');
  });

  it('leans toward the pointer', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    const { unmount } = renderWithProviders(<PlatformStack />);
    const scene = screen.getByRole('img').firstElementChild as HTMLElement;

    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 });
    expect(scene.style.getPropertyValue('--tilt-x')).toBe('-0.500');
    expect(scene.style.getPropertyValue('--tilt-y')).toBe('-0.500');

    unmount();
    raf.mockRestore();
  });
});
