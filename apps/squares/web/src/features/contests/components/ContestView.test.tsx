import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makePlayer, makeSquare, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { Contest, Game } from '../../../types/contest';
import type { ContestViewer, SquarePool } from '../live/viewer';
import type { ContestDialog } from './details/ContestDialogs';
import ContestView from './ContestView';

type Opener = { onOpen: (dialog: ContestDialog) => void };

vi.mock('./grid/ContestGrid', () => ({ default: () => <div data-testid="grid" /> }));
vi.mock('./details/ContestDetails', () => ({ default: () => <div data-testid="details" /> }));
vi.mock('./scoreboard/QuarterStrip', () => ({ default: () => <div data-testid="quarters" /> }));
vi.mock('./sidebar/ActivityFeed', () => ({ default: () => <div data-testid="feed" /> }));
vi.mock('./details/ContestActionIcons', () => ({
  default: ({ onOpen, squaresToGive }: Opener & { squaresToGive: boolean }) => (
    <button data-testid="actions" data-dot={squaresToGive} onClick={() => onOpen('players')}>
      players
    </button>
  ),
}));
vi.mock('./ContestStatusBanner', () => ({
  default: ({
    onOpen,
    pool,
    boardOpen,
    beforeKickoff,
  }: Opener & { pool: SquarePool; boardOpen: boolean; beforeKickoff: boolean }) => (
    <button
      data-testid="banner"
      data-waiting={pool.waiting.length}
      data-open={boardOpen}
      data-before-kickoff={beforeKickoff}
      onClick={() => onOpen('invite')}
    >
      invite
    </button>
  ),
}));
vi.mock('./details/ContestDialogs', () => ({
  default: ({ open }: { open: ContestDialog | null }) => (
    <div data-testid="dialogs">{open ?? 'closed'}</div>
  ),
}));

const owner = makeViewer({ isOwner: true });
const players = [makePlayer({ maxSquares: 0 })];

function renderView({
  contest = makeContest(),
  viewer = owner,
  game,
  status = 'live',
}: {
  contest?: Contest;
  viewer?: ContestViewer;
  game?: Game;
  status?: 'live' | 'reconnecting';
} = {}) {
  return renderWithProviders(
    <ContestView
      contest={contest}
      game={game}
      players={players}
      activity={[]}
      viewer={viewer}
      status={status}
      winnerFlash={null}
      onStale={vi.fn()}
    />
  );
}

describe('ContestView', () => {
  it('lays out every section once under the contest name', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 1, name: 'Test Bowl' })).toBeInTheDocument();
    ['grid', 'details', 'quarters', 'feed', 'actions', 'banner', 'dialogs'].forEach((id) =>
      expect(screen.getAllByTestId(id)).toHaveLength(1)
    );
  });

  it('opens the same dialogs from the header and the banner', () => {
    renderView();
    expect(screen.getByTestId('dialogs')).toHaveTextContent('closed');
    fireEvent.click(screen.getByRole('button', { name: 'invite' }));
    expect(screen.getByTestId('dialogs')).toHaveTextContent('invite');
    fireEvent.click(screen.getByRole('button', { name: 'players' }));
    expect(screen.getByTestId('dialogs')).toHaveTextContent('players');
  });

  it('flags players waiting for squares to the owner while the board is open', () => {
    renderView();
    expect(screen.getByTestId('banner')).toHaveAttribute('data-waiting', '1');
    expect(screen.getByTestId('actions')).toHaveAttribute('data-dot', 'true');
  });

  it('flags nothing once the board is full, or to anyone but the owner', () => {
    renderView({ contest: makeContest({ squares: [makeSquare({ value: 'AB' })] }) });
    expect(screen.getByTestId('banner')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('actions')).toHaveAttribute('data-dot', 'false');

    renderView({ viewer: makeViewer() });
    expect(screen.getAllByTestId('actions')[1]).toHaveAttribute('data-dot', 'false');
  });

  it('tells the banner whether the game is known to be before kickoff', () => {
    renderView();
    expect(screen.getByTestId('banner')).toHaveAttribute('data-before-kickoff', 'false');
    renderView({ game: { status: 'scheduled', period: 0 } as Game });
    expect(screen.getAllByTestId('banner')[1]).toHaveAttribute('data-before-kickoff', 'true');
    renderView({ game: { status: 'in_progress', period: 1 } as Game });
    expect(screen.getAllByTestId('banner')[2]).toHaveAttribute('data-before-kickoff', 'false');
  });

  it('shows the connection state when not live', () => {
    renderView({ status: 'reconnecting' });
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
  });
});
