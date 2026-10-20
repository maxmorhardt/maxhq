import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import LeaderboardPage from './LeaderboardPage';

vi.mock('../features/leaderboard/components/Standings', () => ({
  default: () => <div data-testid="standings" />,
}));

describe('LeaderboardPage', () => {
  it('introduces the standings', () => {
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(screen.getByText(/all-time top 10/i)).toBeInTheDocument();
    expect(screen.getByTestId('standings')).toBeInTheDocument();
  });
});
