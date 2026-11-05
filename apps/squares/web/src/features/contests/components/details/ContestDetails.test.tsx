import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeParticipant, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Game, Participant } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ContestDetails from './ContestDetails';

vi.mock('./SquareActions', () => ({ default: () => <div data-testid="square-actions" /> }));

const fullGrid = (overrides: Partial<Contest> = {}) =>
  makeContest({
    squares: [makeSquare({ value: 'AB' }), makeSquare({ id: 's2', value: 'CD' })],
    ...overrides,
  });

const spectator = makeViewer({ isParticipant: false, participant: undefined, squaresLeft: 0 });

const ownerEntry = makeParticipant({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 50 });
const owner = makeViewer({ viewerId: 'u_owner', isOwner: true, participant: ownerEntry });

function renderDetails(
  contest: Contest,
  viewer: ContestViewer = makeViewer(),
  game?: Game,
  participants: Participant[] = []
) {
  return renderWithProviders(
    <ContestDetails contest={contest} game={game} participants={participants} viewer={viewer} />
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
    expect(screen.getByText(/Fill every square before kickoff/)).toBeInTheDocument();
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

  it('tells a participant with no squares to wait for the owner', () => {
    renderDetails(
      makeContest(),
      makeViewer({ participant: makeParticipant({ maxSquares: 0 }), squaresLeft: 0 })
    );
    expect(screen.getByText(/The owner hasn't given you any squares yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('square-actions')).not.toBeInTheDocument();
  });

  it('tells the owner when nobody has joined', () => {
    renderDetails(board(), owner, undefined, [ownerEntry]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No one has joined yet. Share your invite link.'
    );
  });

  it('tells the owner who is still waiting for squares', () => {
    const waiting = [
      makeParticipant({ id: 'a', userId: 'u_a', maxSquares: 0 }),
      makeParticipant({ id: 'b', userId: 'u_b', maxSquares: 0 }),
    ];
    renderDetails(board(), owner, undefined, [ownerEntry, ...waiting]);
    expect(screen.getByRole('status')).toHaveTextContent('2 participants have no squares yet.');

    renderDetails(board(), owner, undefined, [ownerEntry, waiting[0]]);
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('1 participant has no squares yet.');
  });

  it('tells the owner when squares are left unassigned', () => {
    const pat = makeParticipant({ maxSquares: 49 });
    renderDetails(board(), owner, undefined, [ownerEntry, pat]);
    expect(screen.getByRole('status')).toHaveTextContent('1 square isn’t given to anyone');

    renderDetails(board(), owner, undefined, [ownerEntry, makeParticipant({ maxSquares: 40 })]);
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('10 squares aren’t given to anyone');
  });

  it('has nothing to warn about once every square is given out, or the board is full', () => {
    renderDetails(board(), owner, undefined, [ownerEntry, makeParticipant({ maxSquares: 50 })]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    renderDetails(fullGrid(), owner, undefined, [ownerEntry]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the owner warnings from everyone else', () => {
    renderDetails(board(), makeViewer(), undefined, [ownerEntry]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
