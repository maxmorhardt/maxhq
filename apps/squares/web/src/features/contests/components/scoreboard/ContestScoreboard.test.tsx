import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Game } from '../../../../types/contest';
import { kickoffParts } from '../../../../utils/game';
import ContestScoreboard from './ContestScoreboard';

vi.mock('../details/ContestActionIcons', () => ({ default: () => <div data-testid="actions" /> }));

const game = {
  id: 'g-1',
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  homeAbbr: 'DET',
  awayAbbr: 'CHI',
  status: 'in_progress',
  period: 3,
  homeScore: 17,
  awayScore: 10,
  gameTime: '2026-11-01T18:00:00Z',
  updatedAt: '2026-11-01T19:30:00Z',
} as Game;

function renderBoard(contest: Contest, viewer = makeViewer(), withGame?: Game) {
  return renderWithProviders(
    <ContestScoreboard
      contest={contest}
      game={withGame}
      participants={[]}
      viewer={viewer}
      status="live"
      onRetry={vi.fn()}
    />
  );
}

describe('ContestScoreboard', () => {
  it('shows both teams, the live score, and the quarter being played', () => {
    renderBoard(makeContest({ status: 'Q3' }), makeViewer(), game);

    expect(screen.getByRole('heading', { level: 1, name: 'Test Bowl' })).toBeInTheDocument();
    expect(screen.getByText('Bears')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByLabelText('away score')).toHaveTextContent('10');
    expect(screen.getByLabelText('home score')).toHaveTextContent('17');
    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('puts the kickoff day over its time before the game, to fit on a phone', () => {
    const scheduled = { ...game, status: 'scheduled', period: 0 } as Game;
    renderBoard(makeContest({ status: 'ACTIVE' }), makeViewer(), scheduled);

    const { day, time } = kickoffParts(scheduled.gameTime);
    expect(screen.getByText(day)).toBeInTheDocument();
    expect(screen.getByText(time)).toBeInTheDocument();
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('labels the viewer and the contest privacy', () => {
    renderBoard(makeContest({ visibility: 'public' }), makeViewer({ isOwner: true }));
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('falls back to the contest teams and status without a game', () => {
    renderBoard(
      makeContest({ status: 'FINISHED' }),
      makeViewer({ isParticipant: false, participant: undefined })
    );
    expect(screen.getByText('Away')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('Watching')).toBeInTheDocument();
    expect(screen.getByLabelText('home score')).toHaveTextContent('–');
  });
});
