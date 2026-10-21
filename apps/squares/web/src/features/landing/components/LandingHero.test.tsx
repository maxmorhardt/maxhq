import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import LandingHero from './LandingHero';

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: false, signinRedirect: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LandingHero', () => {
  it('renders the headline as the page heading', () => {
    renderWithProviders(<LandingHero />);

    expect(screen.getByRole('heading', { level: 1, name: /squares pool/i })).toBeInTheDocument();
  });

  it('offers to create a contest and to learn the rules', () => {
    renderWithProviders(<LandingHero />);

    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn More' })).toHaveAttribute('href', '/learn-more');
  });

  it('plays the demo board through to a winner', () => {
    vi.useFakeTimers();
    renderWithProviders(<LandingHero />);

    expect(screen.getByRole('img')).toHaveAccessibleName(/empty/i);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('img')).toHaveAccessibleName(/end of the quarter/i);
  });

  it('jumps straight to the finished board under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
    renderWithProviders(<LandingHero />);

    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAccessibleName(/end of the quarter/i)
    );
  });
});
