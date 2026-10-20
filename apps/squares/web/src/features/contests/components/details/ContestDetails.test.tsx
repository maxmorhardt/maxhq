import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makeParticipant, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ContestDetails from './ContestDetails';

vi.mock('./ContestActionIcons', () => ({ default: () => <div data-testid="action-icons" /> }));
vi.mock('./ScoreUpdateControls', () => ({ default: () => <div data-testid="score-controls" /> }));
vi.mock('./StartGameButton', () => ({ default: () => <div data-testid="start-button" /> }));
vi.mock('./SquareActions', () => ({ default: () => <div data-testid="square-actions" /> }));

const fullGrid = (overrides: Partial<Contest> = {}) =>
  makeContest({
    squares: [makeSquare({ value: 'AB' }), makeSquare({ id: 's2', value: 'CD' })],
    ...overrides,
  });

const owner = makeViewer({ isOwner: true, email: 'owner@x.com' });
const spectator = makeViewer({ isParticipant: false, participant: undefined, squaresLeft: 0 });

function renderDetails(contest: Contest, viewer: ContestViewer = makeViewer()) {
  return renderWithProviders(
    <ContestDetails contest={contest} participants={[makeParticipant()]} viewer={viewer} />
  );
}

describe('ContestDetails', () => {
  it('shows fill progress and the viewer’s squares while open', () => {
    renderDetails(makeContest(), makeViewer({ squaresClaimed: 2 }));
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/0\/9 squares filled/)).toBeInTheDocument();
    expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    expect(screen.getByTestId('square-actions')).toBeInTheDocument();
  });

  it('labels in-game, finished, and deleted contests', () => {
    const { rerender } = renderDetails(makeContest({ status: 'Q2' }));
    expect(screen.getByText('In Progress • Q2')).toBeInTheDocument();
    rerender(
      <ContestDetails
        contest={makeContest({ status: 'FINISHED' })}
        participants={[]}
        viewer={owner}
      />
    );
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('No actions available')).toBeInTheDocument();
    rerender(
      <ContestDetails
        contest={makeContest({ status: 'DELETED' })}
        participants={[]}
        viewer={owner}
      />
    );
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('tells the owner to wait for a full grid', () => {
    renderDetails(makeContest(), owner);
    expect(screen.getByText(/Waiting for all squares/)).toBeInTheDocument();
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
  });

  it('lets the owner start a full manual contest', () => {
    renderDetails(fullGrid(), owner);
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  it('explains that a full linked contest starts at kickoff', () => {
    renderDetails(fullGrid({ gameId: 'g-1' }), owner);
    expect(screen.getByText(/starts automatically/)).toBeInTheDocument();
  });

  it('offers manual scoring only without a linked game', () => {
    const { rerender } = renderDetails(makeContest({ status: 'Q1' }), owner);
    expect(screen.getByTestId('score-controls')).toBeInTheDocument();

    rerender(
      <ContestDetails
        contest={makeContest({
          status: 'Q1',
          gameId: 'g-1',
          game: { awayTeam: 'Bears', homeTeam: 'Lions' } as Contest['game'],
        })}
        participants={[]}
        viewer={owner}
      />
    );
    expect(screen.getByText(/Scores update automatically/)).toHaveTextContent('Bears @ Lions');
  });

  it('invites a spectator of a public contest to get an invite', () => {
    renderDetails(makeContest({ visibility: 'public' }), spectator);
    expect(screen.getByText(/Get an invite link to participate/)).toBeInTheDocument();
    expect(screen.queryByTestId('square-actions')).not.toBeInTheDocument();
  });

  it('always shows the action icons', () => {
    renderDetails(makeContest());
    expect(screen.getByTestId('action-icons')).toBeInTheDocument();
  });
});
