import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import type { Game } from '../../../types/contest';
import GameCard from './GameCard';

const game = (overrides: Partial<Game> = {}) =>
  ({
    id: 'g-1',
    homeTeam: 'Chiefs',
    awayTeam: 'Bills',
    homeAbbr: 'KC',
    awayAbbr: 'BUF',
    gameTime: '2026-10-25T17:00:00Z',
    status: 'scheduled',
    period: 0,
    homeScore: 0,
    awayScore: 0,
    scores: [],
    ...overrides,
  }) as Game;

describe('GameCard', () => {
  it('shows a scheduled game with its kickoff and no score', () => {
    renderWithProviders(<GameCard game={game()} />);

    expect(screen.getByRole('article', { name: 'Bills at Chiefs' })).toBeInTheDocument();
    expect(screen.getByLabelText('Chiefs score')).toHaveTextContent('–');
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('shows a live game with its quarter, score, and points by quarter', () => {
    renderWithProviders(
      <GameCard
        game={game({
          status: 'in_progress',
          period: 3,
          homeScore: 17,
          awayScore: 10,
          scores: [
            { quarter: 2, homeScore: 14, awayScore: 10 },
            { quarter: 1, homeScore: 7, awayScore: 3 },
          ] as Game['scores'],
        })}
      />
    );

    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByLabelText('Chiefs score')).toHaveTextContent('17');
    // home scored 7 in each quarter and away 7 in the second
    expect(screen.getAllByText('7')).toHaveLength(3);
  });

  it('marks a final', () => {
    renderWithProviders(
      <GameCard game={game({ status: 'final', period: 4, homeScore: 20, awayScore: 23 })} />
    );

    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByLabelText('Bills score')).toHaveTextContent('23');
  });
});
