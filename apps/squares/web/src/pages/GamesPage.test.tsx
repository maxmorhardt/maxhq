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

  it('tells visitors they can start a board from a game', () => {
    renderWithProviders(<GamesPage />);
    expect(
      screen.getByText(/pick an upcoming game to start a free squares board/i)
    ).toBeInTheDocument();
  });
});
