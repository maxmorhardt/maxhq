import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makePlayer, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Player } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import PlayersManager from './PlayersManager';

const api = vi.hoisted(() => ({
  useRemovePlayerMutation: vi.fn(),
  useAllotSquaresMutation: vi.fn(),
  useUnbanPlayerMutation: vi.fn(),
  useGetBansQuery: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('./EditPlayerDialog', () => ({
  default: ({
    player,
    claimed,
    maxAllowed,
  }: {
    player: { userId: string } | null;
    claimed: number;
    maxAllowed: number;
  }) =>
    player ? <div data-testid="edit">{`${player.userId} ${claimed} ${maxAllowed}`}</div> : null,
}));
vi.mock('../LeaveContestDialog', () => ({
  default: ({ contest }: { contest: unknown }) => (contest ? <div data-testid="leave" /> : null),
}));

const owner = makePlayer({
  id: 'o',
  userId: 'u_owner',
  displayName: 'Olive O.',
  role: 'owner',
  maxSquares: 10,
});
const pat = makePlayer({
  id: 'p',
  userId: 'u_player',
  displayName: 'Pat P.',
  maxSquares: 5,
});
const newcomer = makePlayer({
  id: 'n',
  userId: 'u_new',
  displayName: 'Nia N.',
  maxSquares: 0,
});
const players = [owner, pat, newcomer];

// pat holds two squares and the owner one
function boardWithClaims(overrides: Partial<Contest> = {}) {
  const contest = makeContest(overrides, 10);
  contest.squares[0] = { ...contest.squares[0], owner: 'u_player', value: 'PP' };
  contest.squares[1] = { ...contest.squares[1], owner: 'u_player', value: 'PP' };
  contest.squares[2] = { ...contest.squares[2], owner: 'u_owner', value: 'OO' };
  return contest;
}

const asOwner = makeViewer({ viewerId: 'u_owner', isOwner: true });

const onInvite = vi.fn();

function renderManager({
  viewer = asOwner,
  contest = boardWithClaims(),
  list = players,
}: { viewer?: ContestViewer; contest?: Contest; list?: Player[] } = {}) {
  return renderWithProviders(
    <PlayersManager
      open
      onClose={vi.fn()}
      onInvite={onInvite}
      contest={contest}
      players={list}
      viewer={viewer}
    />
  );
}

describe('PlayersManager', () => {
  beforeEach(() => {
    onInvite.mockClear();
    api.useRemovePlayerMutation.mockReturnValue(mockMutation(undefined));
    api.useAllotSquaresMutation.mockReturnValue(mockMutation([newcomer]));
    api.useUnbanPlayerMutation.mockReturnValue(mockMutation(undefined));
    api.useGetBansQuery.mockReturnValue({ data: [] });
  });

  it('shows what each player holds out of their limit', () => {
    renderManager();
    expect(screen.getByText('2/5 squares')).toBeInTheDocument();
    expect(screen.getByText('1/10 squares')).toBeInTheDocument();
    expect(screen.getByText('No squares yet')).toBeInTheDocument();
  });

  it('gives the owner the board totals', () => {
    renderManager();
    expect(screen.getByText('Given out 15/100 · Claimed 3')).toBeInTheDocument();
  });

  it('lets the owner invite more players from the list', () => {
    renderManager();
    expect(screen.getByRole('progressbar', { name: 'squares given out' })).toHaveAttribute(
      'aria-valuenow',
      '15'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Invite Players' }));
    expect(onInvite).toHaveBeenCalled();
  });

  it('puts players waiting for squares first, each one tap from the editor', () => {
    renderManager();
    const labels = screen.getAllByText(/^(Waiting for squares|Everyone else|Nia N\.|Pat P\.)$/);
    expect(labels.map((l) => l.textContent)).toEqual([
      'Waiting for squares',
      'Nia N.',
      'Everyone else',
      'Pat P.',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Give squares to Nia N.' }));
    expect(screen.getByTestId('edit')).toHaveTextContent('u_new 0 85');
  });

  it('keeps one list when nobody is waiting', () => {
    renderManager({ list: [owner, pat] });
    expect(screen.queryByText('Waiting for squares')).not.toBeInTheDocument();
    expect(screen.queryByText('Everyone else')).not.toBeInTheDocument();
  });

  it('keeps the totals and give-out tools from everyone else', () => {
    renderManager({ viewer: makeViewer({ viewerId: 'u_player' }) });
    expect(screen.queryByText(/Given out/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite Players' })).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for squares')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
    expect(api.useGetBansQuery).toHaveBeenCalledWith('c-1', { skip: true });
  });

  it('shows players by name only, even to the owner', () => {
    renderManager();
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.queryByText(/@x\.com/)).not.toBeInTheDocument();
  });

  it('shows the owner who each player is', () => {
    const fullNames: Record<string, string> = { u_player: 'Pat Parker' };
    renderManager({
      viewer: makeViewer({
        viewerId: 'u_owner',
        isOwner: true,
        fullName: (id) => fullNames[id ?? ''],
      }),
    });
    expect(screen.getByText('Pat Parker')).toBeInTheDocument();
  });

  it('recognises the viewer by pseudonym', () => {
    renderManager({ viewer: makeViewer({ viewerId: 'u_new' }) });
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('says when nobody has joined', () => {
    renderManager({ list: [] });
    expect(screen.getByText('No players yet')).toBeInTheDocument();
  });

  it('opens the editor with what they hold and the most they can get', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Pat P.' }));
    expect(screen.getByTestId('edit')).toHaveTextContent('u_player 2 90');
  });

  it('gives everyone without squares the same number', async () => {
    const [allot, state] = mockMutation([newcomer]);
    api.useAllotSquaresMutation.mockReturnValue([allot, state]);
    const { store } = renderManager();

    expect(screen.getByText(/1 player has no squares yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Squares each'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Give Each' }));

    await waitFor(() => expect(allot).toHaveBeenCalledWith({ contestId: 'c-1', maxSquares: 8 }));
    expect(store.getState().toast.messages[0]?.message).toBe('Gave 8 squares to 1 player');
  });

  it('never offers more each than the board has left', () => {
    const second = makePlayer({
      id: 'm',
      userId: 'u_more',
      displayName: 'Mo M.',
      maxSquares: 0,
    });
    renderManager({ list: [makePlayer({ ...owner, maxSquares: 90 }), second, newcomer] });

    expect(screen.getByText(/2 players have no squares yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Squares each'), { target: { value: '40' } });
    expect(screen.getByLabelText('Squares each')).toHaveValue(5);
  });

  it('asks the owner to make room when nothing is left to give', () => {
    renderManager({ list: [makePlayer({ ...owner, maxSquares: 100 }), newcomer] });
    expect(screen.getByText(/Lower someone’s squares to make room first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Give squares to/ })).not.toBeInTheDocument();
  });

  it('reports a failed give-out', async () => {
    api.useAllotSquaresMutation.mockReturnValue(
      mockMutation({ error: { status: 400, message: 'too many' } })
    );
    const { store } = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Give Each' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('too many'));
  });

  it('warns that removing someone bans them', async () => {
    const [remove, state] = mockMutation(undefined);
    api.useRemovePlayerMutation.mockReturnValue([remove, state]);
    const { store } = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Pat P.' }));
    expect(screen.getByText(/Their squares go back on the board/)).toBeInTheDocument();
    expect(
      screen.getByText(/can't rejoin with the invite link until you unban them/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'u_player' })
    );
    expect(store.getState().toast.messages[0]?.message).toBe('Pat P. removed');
  });

  it('shows why a removal failed', () => {
    api.useRemovePlayerMutation.mockReturnValue(
      mockMutation(undefined, { error: { status: 403, message: 'Not allowed' } })
    );
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Pat P.' }));
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
  });

  it('lists the banned and lets the owner unban them', async () => {
    api.useGetBansQuery.mockReturnValue({
      data: [
        { userId: 'u_gone', displayName: 'Gail Gone', bannedAt: '' },
        { userId: 'u_anon', displayName: '', bannedAt: '' },
      ],
    });
    const [unban, state] = mockMutation(undefined);
    api.useUnbanPlayerMutation.mockReturnValue([unban, state]);
    const { store } = renderManager();

    expect(screen.getByText('Banned')).toBeInTheDocument();
    expect(screen.getByText('Unnamed player')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unban Gail Gone' }));

    await waitFor(() => expect(unban).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'u_gone' }));
    expect(store.getState().toast.messages[0]?.message).toBe(
      'They can join again with the invite link'
    );
  });

  it('reports a failed unban', async () => {
    api.useGetBansQuery.mockReturnValue({
      data: [{ userId: 'u_gone', displayName: 'Gail Gone', bannedAt: '' }],
    });
    api.useUnbanPlayerMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'down' } })
    );
    const { store } = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Unban Gail Gone' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('down'));
  });

  it('says a removal after kickoff leaves their squares on the board', () => {
    renderManager({ contest: boardWithClaims({ status: 'Q2' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Pat P.' }));
    expect(screen.getByText(/their squares stay on the board without them/)).toBeInTheDocument();
  });

  it('says so when everyone already has squares', async () => {
    api.useAllotSquaresMutation.mockReturnValue(mockMutation([]));
    const { store } = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Give Each' }));
    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Everyone already has squares')
    );
  });

  it('stops edits after kickoff but still allows removals', () => {
    renderManager({ contest: boardWithClaims({ status: 'Q1' }) });
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Give squares/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Pat P.' })).toBeInTheDocument();
  });

  it('lets a player leave, but not change others', () => {
    renderManager({ viewer: makeViewer({ viewerId: 'u_player' }) });
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave contest' }));
    expect(screen.getByTestId('leave')).toBeInTheDocument();
  });

  it('offers nothing once the contest is finished', () => {
    renderManager({
      viewer: makeViewer({ viewerId: 'u_player' }),
      contest: boardWithClaims({ status: 'FINISHED' }),
    });
    expect(screen.queryByRole('button', { name: 'Leave contest' })).not.toBeInTheDocument();
  });
});
