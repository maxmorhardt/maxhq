import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import type { LeaderboardEntry } from '../../../types/leaderboard';
import Standings from './Standings';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({ useGetLeaderboardQuery: vi.fn(), useGetMyRankQuery: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const profile = vi.hoisted(() => ({ useGetMyProfileQuery: vi.fn() }));
vi.mock('../../profile/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...profile,
}));
vi.mock('./LeaderboardPodium', () => ({
  PODIUM_SIZE: 3,
  default: ({ entries, highlightKey }: { entries: LeaderboardEntry[]; highlightKey?: string }) => (
    <div data-testid="podium" data-highlight={highlightKey}>
      {entries.length}
    </div>
  ),
}));
vi.mock('./LeaderboardTable', () => ({
  default: ({ entries, loading }: { entries: LeaderboardEntry[]; loading: boolean }) => (
    <div data-testid="table">{loading ? 'loading' : entries.length}</div>
  ),
}));
vi.mock('./LeaderboardRankCard', () => ({ default: () => <div data-testid="rank" /> }));

const entries = (count: number): LeaderboardEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    displayName: i === 0 ? 'Ann S.' : `Player ${i}`,
    quarterWins: 10 - i,
    squaresClaimed: 0,
    quartersPlayed: 0,
  }));

describe('Standings', () => {
  beforeEach(() => {
    mockAuth({ email: 'ann@x.com' });
    api.useGetLeaderboardQuery.mockReturnValue({
      data: entries(5),
      isLoading: false,
      isError: false,
    });
    api.useGetMyRankQuery.mockReturnValue({
      data: { rank: 1, ranked: true },
      isLoading: false,
      isError: false,
    });
    profile.useGetMyProfileQuery.mockReturnValue({ data: { displayName: 'Ann Smith' } });
  });

  it('puts the top three on the podium and the rest in the table', () => {
    renderWithProviders(<Standings />);
    expect(screen.getByTestId('podium')).toHaveTextContent('3');
    expect(screen.getByTestId('table')).toHaveTextContent('2');
  });

  it('highlights the signed-in player and shows their rank', () => {
    renderWithProviders(<Standings />);
    expect(screen.getByTestId('podium')).toHaveAttribute('data-highlight', '1:Ann S.');
    expect(screen.getByTestId('rank')).toBeInTheDocument();
  });

  it('skips the rank for visitors', () => {
    mockAuth();
    renderWithProviders(<Standings />);
    expect(screen.queryByTestId('rank')).not.toBeInTheDocument();
    expect(api.useGetMyRankQuery).toHaveBeenLastCalledWith(undefined, { skip: true });
  });

  it('lists short leaderboards without a podium', () => {
    api.useGetLeaderboardQuery.mockReturnValue({
      data: entries(2),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<Standings />);
    expect(screen.getByTestId('podium')).toHaveTextContent('0');
    expect(screen.getByTestId('table')).toHaveTextContent('2');
  });

  it('drops the table when the podium holds everyone', () => {
    api.useGetLeaderboardQuery.mockReturnValue({
      data: entries(3),
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<Standings />);
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('shows the table loading state first', () => {
    api.useGetLeaderboardQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderWithProviders(<Standings />);
    expect(screen.queryByTestId('podium')).not.toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveTextContent('loading');
  });

  it('reports a failed load', () => {
    api.useGetLeaderboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderWithProviders(<Standings />);
    expect(screen.getByText(/couldn't load the leaderboard/)).toBeInTheDocument();
  });
});
