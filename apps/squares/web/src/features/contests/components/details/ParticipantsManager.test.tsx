import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeParticipant, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ParticipantsManager from './ParticipantsManager';

const api = vi.hoisted(() => ({
  useRemoveParticipantMutation: vi.fn(),
  useGetRosterQuery: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('./EditParticipantDialog', () => ({
  default: ({ participant }: { participant: { userId: string } | null }) =>
    participant ? <div data-testid="edit">{participant.userId}</div> : null,
}));
vi.mock('../LeaveContestDialog', () => ({
  default: ({ contest }: { contest: unknown }) => (contest ? <div data-testid="leave" /> : null),
}));

const participants = [
  makeParticipant({
    id: 'o',
    userId: 'u_owner',
    displayName: 'Olive O.',
    role: 'owner',
    maxSquares: 10,
  }),
  makeParticipant({
    id: 'p',
    userId: 'u_player',
    displayName: 'Pat P.',
    maxSquares: 5,
  }),
  makeParticipant({
    id: 'v',
    userId: 'u_viewer',
    displayName: 'Vic V.',
    role: 'viewer',
    maxSquares: 0,
  }),
];

const owner = makeViewer({ viewerId: 'u_owner', isOwner: true });

function renderManager(viewer: ContestViewer = owner, contest: Contest = makeContest()) {
  return renderWithProviders(
    <ParticipantsManager
      open
      onClose={vi.fn()}
      contest={contest}
      participants={participants}
      viewer={viewer}
    />
  );
}

describe('ParticipantsManager', () => {
  beforeEach(() => {
    api.useRemoveParticipantMutation.mockReturnValue(mockMutation(undefined));
    api.useGetRosterQuery.mockReturnValue({ data: undefined, refetch: vi.fn() });
  });

  it('lists everyone with their role and square limit', () => {
    renderManager();
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.getByText('max 5 squares')).toBeInTheDocument();
    expect(screen.getAllByText(/max \d+ squares/)).toHaveLength(2);
  });

  it('shows players by name only, even to the owner', () => {
    const { unmount } = renderManager();
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.queryByText(/@x\.com/)).not.toBeInTheDocument();
    unmount();

    renderManager(makeViewer({ viewerId: 'u_viewer', isOwner: false }));
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText(/@x\.com/)).not.toBeInTheDocument();
  });

  it('shows the owner who each player is', () => {
    const refetch = vi.fn();
    api.useGetRosterQuery.mockReturnValue({
      data: [
        { userId: 'u_owner', fullName: 'Olive Owens' },
        { userId: 'u_player', fullName: 'Pat Player' },
        { userId: 'u_viewer', fullName: 'Vic Viewer' },
      ],
      refetch,
    });
    renderManager();
    expect(screen.getByText('Pat Player')).toBeInTheDocument();
    expect(api.useGetRosterQuery).toHaveBeenCalledWith(
      'c-1',
      expect.objectContaining({ skip: false })
    );
    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches the roster when someone new joins', () => {
    const refetch = vi.fn();
    api.useGetRosterQuery.mockReturnValue({
      data: [{ userId: 'u_owner', fullName: 'Olive Owens' }],
      refetch,
    });
    renderManager();
    expect(refetch).toHaveBeenCalled();
  });

  it('never asks a player for the roster', () => {
    renderManager(makeViewer({ viewerId: 'u_player' }));
    expect(api.useGetRosterQuery).toHaveBeenCalledWith(
      'c-1',
      expect.objectContaining({ skip: true })
    );
    expect(screen.queryByText('Pat Player')).not.toBeInTheDocument();
  });

  it('recognises the viewer by pseudonym', () => {
    renderManager(makeViewer({ viewerId: 'u_viewer', isOwner: false }));
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('says when nobody has joined', () => {
    renderWithProviders(
      <ParticipantsManager
        open
        onClose={vi.fn()}
        contest={makeContest()}
        participants={[]}
        viewer={owner}
      />
    );
    expect(screen.getByText('No participants yet')).toBeInTheDocument();
  });

  it('lets the owner edit before kickoff', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Pat P.' }));
    expect(screen.getByTestId('edit')).toHaveTextContent('u_player');
  });

  it('lets the owner remove someone after confirming', async () => {
    const [remove, state] = mockMutation(undefined);
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    const { store } = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Pat P.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'u_player' })
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

  it('stops edits after kickoff and all changes once the contest is over', () => {
    renderManager(owner, makeContest({ status: 'Q1' }));
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Pat P.' })).toBeInTheDocument();
  });

  it('lets a participant leave, but not change others', () => {
    renderManager(makeViewer({ viewerId: 'u_player' }));
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave contest' }));
    expect(screen.getByTestId('leave')).toBeInTheDocument();
  });

  it('offers nothing once the contest is finished', () => {
    renderManager(makeViewer({ viewerId: 'u_player' }), makeContest({ status: 'FINISHED' }));
    expect(screen.queryByRole('button', { name: 'Leave contest' })).not.toBeInTheDocument();
  });
});
