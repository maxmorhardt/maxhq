import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import ContestsPage from './ContestsPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/contests/components/list/ContestsBrowser', () => ({
  default: () => <div data-testid="browser" />,
  ContestsBrowserSkeleton: () => <div data-testid="skeleton" />,
}));

describe('ContestsPage', () => {
  it('shows the contests to a signed-in user', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<ContestsPage />);
    expect(screen.getByTestId('browser')).toBeInTheDocument();
  });

  it('shows the skeleton while the session restores', () => {
    mockAuth({ isLoading: true });
    renderWithProviders(<ContestsPage />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows a signed-out visitor what an account gets them', () => {
    mockAuth();
    renderWithProviders(<ContestsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'All your boards in one place' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });
});
