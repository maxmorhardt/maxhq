import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeParticipant, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Participant } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ParticipantsManager from './ParticipantsManager';

const api = vi.hoisted(() => ({
  useRemoveParticipantMutation: vi.fn(),
  useAllotSquaresMutation: vi.fn(),
  useUnbanParticipantMutation: vi.fn(),
  useGetBansQuery: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('./EditParticipantDialog', () => ({
  default: ({
    participant,
    claimed,
    maxAllowed,
  }: {
    participant: { userId: string } | null;
    claimed: number;
    maxAllowed: number;
  }) =>
    participant ? (
      <div data-testid="edit">{`${participant.userId} ${claimed} ${maxAllowed}`}</div>
    ) : null,
}));
vi.mock('../LeaveContestDialog', () => ({
  default: ({ contest }: { contest: unknown }) => (contest ? <div data-testid="leave" /> : null),
}));

const owner = makeParticipant({
  id: 'o',
  userId: 'u_owner',
  displayName: 'Olive O.',
  role: 'owner',
  maxSquares: 10,
});
const pat = makeParticipant({
  id: 'p',
  userId: 'u_participant',
  displayName: 'Pat P.',
  maxSquares: 5,
});
const newcomer = makeParticipant({
  id: 'n',
  userId: 'u_new',
  displayName: 'Nia N.',
  maxSquares: 0,
});
const participants = [owner, pat, newcomer];

// pat holds two squares and the owner one
function boardWithClaims(overrides: Partial<Contest> = {}) {
  const contest = makeContest(overrides, 10);
  contest.squares[0] = { ...contest.squares[0], owner: 'u_participant', value: 'PP' };
  contest.squares[1] = { ...contest.squares[1], owner: 'u_participant', value: 'PP' };
  contest.squares[2] = { ...contest.squares[2], owner: 'u_owner', value: 'OO' };
  return contest;
}

const asOwner = makeViewer({ viewerId: 'u_owner', isOwner: true });

function renderManager({
  viewer = asOwner,
  contest = boardWithClaims(),
  list = participants,
}: { viewer?: ContestViewer; contest?: Contest; list?: Participant[] } = {}) {
  return renderWithProviders(
    <ParticipantsManager
      open
      onClose={vi.fn()}
      contest={contest}
      participants={list}
      viewer={viewer}
    />
  );
}

describe('ParticipantsManager', () => {
  beforeEach(() => {
    api.useRemoveParticipantMutation.mockReturnValue(mockMutation(undefined));
    api.useAllotSquaresMutation.mockReturnValue(mockMutation([newcomer]));
    api.useUnbanParticipantMutation.mockReturnValue(mockMutation(undefined));
    api.useGetBansQuery.mockReturnValue({ data: [] });
  });

  it('shows what each participant holds out of their limit', () => {
    renderManager();
    expect(screen.getByText('2/5 squares')).toBeInTheDocument();
    expect(screen.getByText('1/10 squares')).toBeInTheDocument();
    expect(screen.getByText('No squares yet')).toBeInTheDocument();
  });

  it('gives the owner the board totals', () => {
    renderManager();
    expect(screen.getByText('Given out 15/100 · Claimed 3')).toBeInTheDocument();
  });

  it('keeps the totals and give-out tools from everyone else', () => {
    renderManager({ viewer: makeViewer({ viewerId: 'u_participant' }) });
    expect(screen.queryByText(/Given out/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
    expect(api.useGetBansQuery).toHaveBeenCalledWith('c-1', { skip: true });
  });

  it('shows participants by name only, even to the owner', () => {
    renderManager();
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.queryByText(/@x\.com/)).not.toBeInTheDocument();
  });

  it('shows the owner who each participant is', () => {
    const fullNames: Record<string, string> = { u_participant: 'Pat Parker' };
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
    expect(screen.getByText('No participants yet')).toBeInTheDocument();
  });

  it('opens the editor with what they hold and the most they can get', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Pat P.' }));
    expect(screen.getByTestId('edit')).toHaveTextContent('u_participant 2 90');
  });

  it('gives everyone without squares the same number', async () => {
    const [allot, state] = mockMutation([newcomer]);
    api.useAllotSquaresMutation.mockReturnValue([allot, state]);
    const { store } = renderManager();

    expect(screen.getByText(/1 participant has no squares yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Squares each'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Give Each' }));

    await waitFor(() => expect(allot).toHaveBeenCalledWith({ contestId: 'c-1', maxSquares: 8 }));
    expect(store.getState().toast.messages[0]?.message).toBe('Gave 8 squares to 1 participant');
  });

  it('never offers more each than the board has left', () => {
    const second = makeParticipant({
      id: 'm',
      userId: 'u_more',
      displayName: 'Mo M.',
      maxSquares: 0,
    });
    renderManager({ list: [makeParticipant({ ...owner, maxSquares: 90 }), second, newcomer] });

    expect(screen.getByText(/2 participants have no squares yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Squares each'), { target: { value: '40' } });
    expect(screen.getByLabelText('Squares each')).toHaveValue(5);
  });

  it('asks the owner to make room when nothing is left to give', () => {
    renderManager({ list: [makeParticipant({ ...owner, maxSquares: 100 }), newcomer] });
    expect(screen.getByText(/Lower someone’s squares to make room first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
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
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    const { store } = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Pat P.' }));
    expect(
      screen.getByText(/can't rejoin with the invite link until you unban them/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'u_participant' })
    );
    expect(store.getState().toast.messages[0]?.message).toBe('Participant removed');
  });

  it('shows why a removal failed', () => {
    api.useRemoveParticipantMutation.mockReturnValue(
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
    api.useUnbanParticipantMutation.mockReturnValue([unban, state]);
    const { store } = renderManager();

    expect(screen.getByText('Banned')).toBeInTheDocument();
    expect(screen.getByText('Unnamed participant')).toBeInTheDocument();
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
    api.useUnbanParticipantMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'down' } })
    );
    const { store } = renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Unban Gail Gone' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('down'));
  });

  it('stops edits after kickoff but still allows removals', () => {
    renderManager({ contest: boardWithClaims({ status: 'Q1' }) });
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give Each' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Pat P.' })).toBeInTheDocument();
  });

  it('lets a participant leave, but not change others', () => {
    renderManager({ viewer: makeViewer({ viewerId: 'u_participant' }) });
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave contest' }));
    expect(screen.getByTestId('leave')).toBeInTheDocument();
  });

  it('offers nothing once the contest is finished', () => {
    renderManager({
      viewer: makeViewer({ viewerId: 'u_participant' }),
      contest: boardWithClaims({ status: 'FINISHED' }),
    });
    expect(screen.queryByRole('button', { name: 'Leave contest' })).not.toBeInTheDocument();
  });
});
