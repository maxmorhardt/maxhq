import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import type { Game } from '../../../types/contest';
import GamesScoreboard from './GamesScoreboard';

const api = vi.hoisted(() => ({ useGetScoreboardQuery: vi.fn() }));
vi.mock('../api', () => api);
vi.mock('../useGamesStream', () => ({ useGamesStream: vi.fn() }));

const game = (id: string, gameTime: string, status: Game['status'] = 'scheduled') =>
  ({
    id,
    homeTeam: `Home ${id}`,
    awayTeam: `Away ${id}`,
    gameTime,
    status,
    period: status === 'in_progress' ? 2 : 0,
    homeScore: 0,
    awayScore: 0,
    updatedAt: gameTime,
  }) as Game;

const board = {
  season: 2026,
  seasonType: 2,
  week: 7,
  games: [
    game('a', '2026-10-22T00:15:00Z', 'in_progress'),
    game('b', '2026-10-25T17:00:00Z'),
    game('c', '2026-10-25T20:25:00Z'),
  ],
};

describe('GamesScoreboard', () => {
  beforeEach(() => {
    api.useGetScoreboardQuery.mockReturnValue({
      data: board,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('names the week and counts live games', () => {
    renderWithProviders(<GamesScoreboard />);

    expect(screen.getByRole('heading', { name: 'Week 7' })).toBeInTheDocument();
    expect(screen.getByText('2026 season')).toBeInTheDocument();
    expect(screen.getByText('1 live')).toBeInTheDocument();
  });

  it('groups the games by day', () => {
    renderWithProviders(<GamesScoreboard />);

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(2);
  });

  it('steps to the next and previous week', () => {
    renderWithProviders(<GamesScoreboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(api.useGetScoreboardQuery).toHaveBeenLastCalledWith({
      season: 2026,
      seasonType: 2,
      week: 8,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(api.useGetScoreboardQuery).toHaveBeenLastCalledWith({
      season: 2026,
      seasonType: 2,
      week: 6,
    });
  });

  it('stops at the edges of the season', () => {
    api.useGetScoreboardQuery.mockReturnValue({
      data: { ...board, week: 18 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderWithProviders(<GamesScoreboard />);

    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('says when there are no games', () => {
    api.useGetScoreboardQuery.mockReturnValue({
      data: { season: 0, seasonType: 0, week: 0, games: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderWithProviders(<GamesScoreboard />);

    expect(screen.getByText('No games this week.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'This Week' })).toBeInTheDocument();
  });

  it('shows placeholders while loading', () => {
    api.useGetScoreboardQuery.mockReturnValue({ isLoading: true });
    renderWithProviders(<GamesScoreboard />);

    expect(screen.getByTestId('scoreboard-loading')).toBeInTheDocument();
  });

  it('offers a retry when the scores fail to load', () => {
    const refetch = vi.fn();
    api.useGetScoreboardQuery.mockReturnValue({ isLoading: false, isError: true, refetch });
    renderWithProviders(<GamesScoreboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
