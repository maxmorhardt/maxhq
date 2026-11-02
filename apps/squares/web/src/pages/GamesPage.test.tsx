import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import GamesPage from './GamesPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/games/components/GamesScoreboard', () => ({
  default: () => <div data-testid="scoreboard" />,
}));

describe('GamesPage', () => {
  beforeEach(() => {
    mockAuth();
  });

  it('titles the page and shows the scoreboard', () => {
    renderWithProviders(<GamesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });

  it('points a signed-out visitor to a free board', () => {
    renderWithProviders(<GamesPage />);
    expect(screen.getByRole('heading', { name: 'New to Squares?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
  });

  it('leaves the pitch out for a signed-in player', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<GamesPage />);
    expect(screen.queryByRole('heading', { name: 'New to Squares?' })).not.toBeInTheDocument();
  });
});
