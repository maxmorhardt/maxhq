import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../test/auth';
import { renderWithProviders } from '../test/render';
import LeaderboardPage from './LeaderboardPage';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../features/leaderboard/components/Standings', () => ({
  default: ({ header }: { header?: React.ReactNode }) => (
    <div data-testid="standings">{header}</div>
  ),
}));

describe('LeaderboardPage', () => {
  beforeEach(() => {
    mockAuth();
  });

  it('introduces the standings', () => {
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(screen.getByText(/all-time top 10/i)).toBeInTheDocument();
    expect(screen.getByTestId('standings')).toBeInTheDocument();
    expect(screen.getByText(/Win rate is quarter wins/)).toBeInTheDocument();
  });

  it('points a signed-out visitor to a free board', () => {
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByText(/want to climb the leaderboard/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start a free board/i })).toBeInTheDocument();
  });

  it('rewords the pitch for a signed-in player', () => {
    mockAuth({ email: 'a@x.com' });
    renderWithProviders(<LeaderboardPage />);
    expect(screen.queryByText(/want to climb the leaderboard/i)).not.toBeInTheDocument();
    expect(screen.getByText(/every quarter you win counts here/i)).toBeInTheDocument();
  });
});
