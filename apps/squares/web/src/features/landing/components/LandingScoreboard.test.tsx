import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import LandingScoreboard from './LandingScoreboard';

const stats = vi.hoisted(() => ({ useGetSiteStatsQuery: vi.fn() }));
vi.mock('../api', () => stats);

describe('LandingScoreboard', () => {
  beforeEach(() => {
    stats.useGetSiteStatsQuery.mockReturnValue({
      data: { contestsCreatedToday: 12, squaresClaimedToday: 1840, totalActiveContests: 5 },
      isLoading: false,
    });
  });

  it('titles the scoreboard', () => {
    renderWithProviders(<LandingScoreboard />);

    expect(screen.getByRole('region', { name: 'Today on Squares' })).toBeInTheDocument();
  });

  it('shows each stat with its label', () => {
    renderWithProviders(<LandingScoreboard />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText((1840).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('Active contests')).toBeInTheDocument();
  });

  it('shows placeholders while stats load', () => {
    stats.useGetSiteStatsQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<LandingScoreboard />);

    expect(screen.getAllByTestId('scoreboard-loading')).toHaveLength(3);
  });

  it('shows a dash when a stat is missing', () => {
    stats.useGetSiteStatsQuery.mockReturnValue({ data: undefined, isLoading: false });
    renderWithProviders(<LandingScoreboard />);

    expect(screen.getAllByText('–')).toHaveLength(3);
  });
});
