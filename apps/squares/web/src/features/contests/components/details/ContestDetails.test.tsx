import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Game } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ContestDetails from './ContestDetails';

vi.mock('./SquareActions', () => ({ default: () => <div data-testid="square-actions" /> }));

const fullGrid = (overrides: Partial<Contest> = {}) =>
  makeContest({
    squares: [makeSquare({ value: 'AB' }), makeSquare({ id: 's2', value: 'CD' })],
    ...overrides,
  });

const spectator = makeViewer({ isParticipant: false, participant: undefined, squaresLeft: 0 });

function renderDetails(contest: Contest, viewer: ContestViewer = makeViewer(), game?: Game) {
  return renderWithProviders(<ContestDetails contest={contest} game={game} viewer={viewer} />);
}

describe('ContestDetails', () => {
  it('shows fill progress and the viewer’s squares while open', () => {
    renderDetails(makeContest(), makeViewer({ squaresClaimed: 2 }));
    expect(screen.getByRole('heading', { name: 'The Board' })).toBeInTheDocument();
    expect(screen.getByText('9 open')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByTestId('square-actions')).toBeInTheDocument();
    expect(screen.getByText(/Fill every square before kickoff/)).toBeInTheDocument();
  });

  it('names the kickoff of a scheduled game', () => {
    const game = { status: 'scheduled', gameTime: '2026-11-01T18:00:00Z' } as Game;
    renderDetails(fullGrid(), makeViewer(), game);
    expect(screen.getByText('Board full')).toBeInTheDocument();
    expect(
      screen.getByText(/It locks and the numbers are drawn at kickoff \(/)
    ).toBeInTheDocument();
  });

  it('explains each later stage', () => {
    const { unmount } = renderDetails(fullGrid({ status: 'Q2' }));
    expect(screen.getByText(/The board is locked and the numbers are drawn/)).toBeInTheDocument();
    expect(screen.queryByTestId('square-actions')).not.toBeInTheDocument();
    unmount();

    renderDetails(fullGrid({ status: 'FINISHED' }));
    expect(screen.getByText('Final. Every quarter has been called.')).toBeInTheDocument();
  });

  it('says when the contest was deleted', () => {
    renderDetails(fullGrid({ status: 'DELETED' }));
    expect(screen.getByText('This contest was deleted.')).toBeInTheDocument();
  });

  it('invites a spectator of a public contest to get an invite', () => {
    renderDetails(makeContest({ visibility: 'public' }), spectator);
    expect(screen.getByText(/Ask the owner for an invite link/)).toBeInTheDocument();
    expect(screen.queryByText('Your squares')).not.toBeInTheDocument();
  });
});
