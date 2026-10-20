import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeContest, makeQuarterResult, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Game } from '../../../../types/contest';
import QuarterStrip from './QuarterStrip';

const quarters = () =>
  within(screen.getByRole('list', { name: 'Quarter winners' })).getAllByRole('listitem');

describe('QuarterStrip', () => {
  it('lists four unplayed quarters before kickoff', () => {
    renderWithProviders(<QuarterStrip contest={makeContest()} viewer={makeViewer()} />);

    expect(quarters()).toHaveLength(4);
    expect(screen.getAllByText('Not yet played')).toHaveLength(4);
  });

  it('shows each called quarter with its score and winner', () => {
    const contest = makeContest({
      status: 'Q3',
      quarterResults: [
        makeQuarterResult({
          quarter: 1,
          homeTeamScore: 7,
          awayTeamScore: 3,
          winner: 'jordan@x.com',
          winnerName: 'Jordan',
        }),
        makeQuarterResult({
          id: 'qr-2',
          quarter: 2,
          homeTeamScore: 14,
          awayTeamScore: 10,
          winner: 'player@x.com',
        }),
      ],
    });
    const game = {
      status: 'in_progress',
      period: 3,
      scores: [
        { quarter: 1, homeScore: 7, awayScore: 3 },
        { quarter: 2, homeScore: 14, awayScore: 10 },
      ],
    } as Game;

    renderWithProviders(<QuarterStrip contest={contest} game={game} viewer={makeViewer()} />);

    const [q1, q2, q3, q4] = quarters();
    expect(q1).toHaveTextContent('3–7');
    expect(q1).toHaveTextContent('Jordan');
    expect(q2).toHaveTextContent('You won');
    expect(q3).toHaveAttribute('aria-current', 'step');
    expect(q3).toHaveTextContent('In progress');
    expect(q4).toHaveTextContent('Not yet played');
  });

  it('notes a quarter that ended without a winner', () => {
    const game = {
      status: 'final',
      period: 4,
      scores: [{ quarter: 1, homeScore: 0, awayScore: 3 }],
    } as Game;

    renderWithProviders(<QuarterStrip contest={makeContest()} game={game} viewer={makeViewer()} />);

    expect(quarters()[0]).toHaveTextContent('No winner');
  });
});
