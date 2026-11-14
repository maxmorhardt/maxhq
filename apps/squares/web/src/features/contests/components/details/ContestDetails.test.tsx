import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makePlayer, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Game } from '../../../../types/contest';
import { isBoardOpen, type ContestViewer } from '../../live/viewer';
import ContestDetails from './ContestDetails';

vi.mock('./SquareActions', () => ({ default: () => <div data-testid="square-actions" /> }));

const fullGrid = (overrides: Partial<Contest> = {}) =>
  makeContest({
    squares: [makeSquare({ value: 'AB' }), makeSquare({ id: 's2', value: 'CD' })],
    ...overrides,
  });

const spectator = makeViewer({ isPlayer: false, player: undefined, squaresLeft: 0 });

const ownerEntry = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 50 });
const owner = makeViewer({ viewerId: 'u_owner', isOwner: true, player: ownerEntry });

function renderDetails(contest: Contest, viewer: ContestViewer = makeViewer(), game?: Game) {
  return renderWithProviders(
    <ContestDetails
      contest={contest}
      game={game}
      viewer={viewer}
      boardOpen={isBoardOpen(contest)}
    />
  );
}

const board = () => makeContest({}, 10);

describe('ContestDetails', () => {
  it('shows fill progress and the viewer’s squares while open', () => {
    renderDetails(makeContest(), makeViewer({ squaresClaimed: 2 }));
    expect(screen.getByRole('heading', { name: 'The Board' })).toBeInTheDocument();
    expect(screen.getByText('9 open')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByTestId('square-actions')).toBeInTheDocument();
    expect(
      screen.getByText(/drawn at kickoff if every square is claimed\. If not, the board stays open/)
    ).toBeInTheDocument();
  });

  it('names the kickoff of a scheduled game', () => {
    const game = { status: 'scheduled', gameTime: '2026-11-01T18:00:00Z' } as Game;
    renderDetails(fullGrid(), makeViewer(), game);
    expect(screen.getByText('Board full')).toBeInTheDocument();
    expect(
      screen.getByText(/The board is full and locked\. The numbers are drawn at kickoff \(/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('square-actions')).not.toBeInTheDocument();
  });

  it('says the board stays open once a game kicks off without a full board', () => {
    const game = { status: 'in_progress', period: 1 } as Game;
    renderDetails(makeContest(), makeViewer(), game);
    expect(screen.getByText(/The game is on and the board is still open/)).toBeInTheDocument();
    expect(screen.getByTestId('square-actions')).toBeInTheDocument();
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

  it('leaves a spectator to the banner above the board', () => {
    renderDetails(makeContest({ visibility: 'public' }), spectator);
    expect(screen.queryByText(/invite link/)).not.toBeInTheDocument();
    expect(screen.queryByText('Your squares')).not.toBeInTheDocument();
  });

  it('offers no square tools to a player still waiting for squares', () => {
    renderDetails(
      makeContest(),
      makeViewer({ player: makePlayer({ maxSquares: 0 }), squaresLeft: 0 })
    );
    expect(screen.queryByTestId('square-actions')).not.toBeInTheDocument();
  });

  it('leaves the owner’s next steps to the banner above the board', () => {
    renderDetails(board(), owner);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
