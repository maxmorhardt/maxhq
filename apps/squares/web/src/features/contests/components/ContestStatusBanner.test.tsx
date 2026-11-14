import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makePlayer, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { Contest, Player } from '../../../types/contest';
import type { ContestViewer, SquarePool } from '../live/viewer';
import ContestStatusBanner from './ContestStatusBanner';

const ownerEntry = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 2 });
const owner = makeViewer({ viewerId: 'u_owner', isOwner: true, player: ownerEntry });
const spectator = makeViewer({ isPlayer: false, player: undefined, squaresLeft: 0 });
const waitingPlayer = makeViewer({ player: makePlayer({ maxSquares: 0 }), squaresLeft: 0 });
const nia = makePlayer({ id: 'n', userId: 'u_nia', displayName: 'Nia N.', maxSquares: 0 });
const mo = { ...nia, id: 'm', userId: 'u_mo' };
const pat = makePlayer({ maxSquares: 4 });

interface Options {
  contest?: Contest;
  players?: Player[];
  pool?: Partial<SquarePool>;
  boardOpen?: boolean;
  removed?: boolean;
}

function renderBanner(
  viewer: ContestViewer,
  {
    contest = makeContest(),
    players = [ownerEntry],
    pool = {},
    boardOpen = true,
    removed = false,
  }: Options = {}
) {
  const onOpen = vi.fn();
  renderWithProviders(
    <ContestStatusBanner
      contest={contest}
      players={players}
      viewer={viewer}
      pool={{ allocated: 0, unallocated: 50, waiting: [], ...pool }}
      boardOpen={boardOpen}
      removed={removed}
      onOpen={onOpen}
    />
  );
  return onOpen;
}

const banner = () => screen.queryByRole('status');

describe('ContestStatusBanner', () => {
  it('tells someone watching an open board how to play', () => {
    renderBanner(spectator);
    expect(banner()).toHaveTextContent(
      "You're watching this contest. Ask the owner for the invite link to play."
    );
  });

  it('only says they are watching once the board is closed', () => {
    renderBanner(spectator, { contest: makeContest({ status: 'Q2' }), boardOpen: false });
    expect(banner()).toHaveTextContent(/^You’re watching this contest\.$/);
  });

  it('doesn’t send a removed player back to the invite link', () => {
    renderBanner(spectator, { removed: true });
    expect(banner()).toHaveTextContent(/^You’re watching this contest\.$/);
  });

  it('asks the owner to share the link while nobody has joined', () => {
    const onOpen = renderBanner(owner);
    expect(banner()).toHaveTextContent('Nobody has joined yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Share Invite Link' }));
    expect(onOpen).toHaveBeenCalledWith('invite');
  });

  it('names who is waiting for squares, or counts them', () => {
    const onOpen = renderBanner(owner, { players: [ownerEntry, nia], pool: { waiting: [nia] } });
    expect(banner()).toHaveTextContent('Nia N. is waiting for squares.');
    fireEvent.click(screen.getByRole('button', { name: 'Give Squares' }));
    expect(onOpen).toHaveBeenCalledWith('players');

    renderBanner(owner, { players: [ownerEntry, nia, mo], pool: { waiting: [nia, mo] } });
    expect(screen.getByText('2 players are waiting for squares.')).toBeInTheDocument();
  });

  it('asks the owner to make room when every square is handed out', () => {
    const onOpen = renderBanner(owner, {
      players: [ownerEntry, nia],
      pool: { waiting: [nia], unallocated: 0 },
    });
    expect(banner()).toHaveTextContent('Nia N. is waiting. Lower someone’s squares to make room.');
    fireEvent.click(screen.getByRole('button', { name: 'Manage Players' }));
    expect(onOpen).toHaveBeenCalledWith('players');
  });

  it('keeps asking the owner to make room on a full board until the numbers are drawn', () => {
    renderBanner(owner, { boardOpen: false, pool: { waiting: [nia], unallocated: 0 } });
    expect(banner()).toHaveTextContent('Nia N. is waiting. Lower someone’s squares to make room.');
  });

  it('drops the owner’s prompts once the numbers are drawn', () => {
    renderBanner(owner, {
      contest: makeContest({ status: 'Q1' }),
      boardOpen: false,
      pool: { waiting: [nia] },
    });
    expect(banner()).not.toBeInTheDocument();
  });

  it('stops asking for invites once the board is full', () => {
    renderBanner(makeViewer({ ...owner, squaresLeft: 0 }), { boardOpen: false });
    expect(banner()).not.toBeInTheDocument();
  });

  it('asks a player to pick the squares they have left', () => {
    renderBanner(makeViewer({ squaresLeft: 1 }));
    expect(banner()).toHaveTextContent(
      'You have 1 square left. Tap open squares on the board to claim them.'
    );
  });

  it('asks the owner to pick their own squares once nobody is waiting', () => {
    renderBanner(owner, { players: [ownerEntry, pat] });
    expect(banner()).toHaveTextContent('You have 5 squares left.');
  });

  it('tells a player with no squares to ask the owner while the board is open', () => {
    renderBanner(waitingPlayer);
    expect(banner()).toHaveTextContent(
      'You don’t have any squares yet. Ask the owner to give you some.'
    );
  });

  it('tells a player with no squares when the board is full', () => {
    renderBanner(waitingPlayer, { boardOpen: false });
    expect(banner()).toHaveTextContent(
      'The board is full. Watch the game, or ask the owner to open up a spot.'
    );
  });

  it('goes quiet once the squares are picked or the numbers are drawn', () => {
    renderBanner(makeViewer({ squaresLeft: 0 }));
    renderBanner(waitingPlayer, { contest: makeContest({ status: 'Q1' }), boardOpen: false });
    renderBanner(makeViewer(), { boardOpen: false });
    expect(banner()).not.toBeInTheDocument();
  });

  it('goes away once the contest is over', () => {
    renderBanner(spectator, { contest: makeContest({ status: 'FINISHED' }), boardOpen: false });
    expect(banner()).not.toBeInTheDocument();
  });
});
