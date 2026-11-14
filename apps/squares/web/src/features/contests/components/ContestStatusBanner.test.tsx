import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeContest, makePlayer, makeViewer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import type { Contest, Player } from '../../../types/contest';
import type { ContestViewer } from '../live/viewer';
import ContestStatusBanner from './ContestStatusBanner';

const ownerEntry = makePlayer({ id: 'o', userId: 'u_owner', role: 'owner', maxSquares: 2 });
const owner = makeViewer({ viewerId: 'u_owner', isOwner: true, player: ownerEntry });
const spectator = makeViewer({ isPlayer: false, player: undefined, squaresLeft: 0 });
const waitingPlayer = makeViewer({ player: makePlayer({ maxSquares: 0 }), squaresLeft: 0 });
const nia = makePlayer({ id: 'n', userId: 'u_nia', displayName: 'Nia N.', maxSquares: 0 });
const pat = makePlayer({ maxSquares: 4 });

interface Options {
  contest?: Contest;
  players?: Player[];
  waiting?: Player[];
  boardOpen?: boolean;
  kickedOff?: boolean;
}

function renderBanner(
  viewer: ContestViewer,
  {
    contest = makeContest(),
    players = [ownerEntry],
    waiting = [],
    boardOpen = true,
    kickedOff = false,
  }: Options = {}
) {
  const onOpen = vi.fn();
  renderWithProviders(
    <ContestStatusBanner
      contest={contest}
      players={players}
      viewer={viewer}
      waiting={waiting}
      boardOpen={boardOpen}
      kickedOff={kickedOff}
      onOpen={onOpen}
    />
  );
  return onOpen;
}

const banner = () => screen.queryByRole('status');

describe('ContestStatusBanner', () => {
  it('tells someone watching how to play, even once the board is closed', () => {
    renderBanner(spectator, { contest: makeContest({ status: 'Q2' }), boardOpen: false });
    expect(banner()).toHaveTextContent(
      "You're watching this contest. Ask the owner for the invite link to play."
    );
  });

  it('asks the owner to share the link while nobody has joined', () => {
    const onOpen = renderBanner(owner);
    expect(banner()).toHaveTextContent('Nobody has joined yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Share Invite Link' }));
    expect(onOpen).toHaveBeenCalledWith('invite');
  });

  it('names who is waiting for squares, or counts them', () => {
    const onOpen = renderBanner(owner, { players: [ownerEntry, nia], waiting: [nia] });
    expect(banner()).toHaveTextContent('Nia N. is waiting for squares.');
    fireEvent.click(screen.getByRole('button', { name: 'Give Squares' }));
    expect(onOpen).toHaveBeenCalledWith('players');

    const mo = { ...nia, id: 'm', userId: 'u_mo' };
    renderBanner(owner, { players: [ownerEntry, nia, mo], waiting: [nia, mo] });
    expect(screen.getByText('2 players are waiting for squares.')).toBeInTheDocument();
  });

  it('drops the owner’s prompts once the board is full or closed', () => {
    renderBanner(makeViewer({ ...owner, squaresLeft: 0 }), { boardOpen: false, waiting: [nia] });
    expect(banner()).not.toBeInTheDocument();
  });

  it('asks a player to pick their squares before kickoff', () => {
    renderBanner(makeViewer({ squaresLeft: 1 }));
    expect(banner()).toHaveTextContent('You have 1 square left. Pick them before kickoff.');
  });

  it('keeps asking after kickoff while the board is still open', () => {
    renderBanner(makeViewer({ squaresLeft: 3 }), { kickedOff: true });
    expect(banner()).toHaveTextContent('You have 3 squares left. Pick them on the board.');
  });

  it('asks the owner to pick their own squares once everyone has some', () => {
    renderBanner(owner, { players: [ownerEntry, pat] });
    expect(banner()).toHaveTextContent('You have 5 squares left.');
  });

  it('tells a player with no squares to ask the owner while the board is open', () => {
    renderBanner(waitingPlayer, { kickedOff: true });
    expect(banner()).toHaveTextContent(
      'You don’t have any squares yet. Ask the owner to give you some.'
    );
  });

  it('goes quiet once the squares are picked or the board closes', () => {
    renderBanner(makeViewer({ squaresLeft: 0 }));
    renderBanner(waitingPlayer, { boardOpen: false });
    renderBanner(makeViewer(), { boardOpen: false });
    expect(banner()).not.toBeInTheDocument();
  });

  it('goes away once the contest is over', () => {
    renderBanner(spectator, { contest: makeContest({ status: 'FINISHED' }), boardOpen: false });
    expect(banner()).not.toBeInTheDocument();
  });
});
