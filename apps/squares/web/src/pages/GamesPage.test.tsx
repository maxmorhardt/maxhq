import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import GamesPage from './GamesPage';

vi.mock('../features/games/components/GamesScoreboard', () => ({
  default: () => <div data-testid="scoreboard" />,
}));

describe('GamesPage', () => {
  it('titles the page and shows the scoreboard', () => {
    renderWithProviders(<GamesPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Games' })).toBeInTheDocument();
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });
});
