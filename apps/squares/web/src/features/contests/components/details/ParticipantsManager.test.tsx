import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeParticipant, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import type { ContestViewer } from '../../live/viewer';
import ParticipantsManager from './ParticipantsManager';

const api = vi.hoisted(() => ({ useRemoveParticipantMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('./EditParticipantDialog', () => ({
  default: ({ participant }: { participant: { userId: string } | null }) =>
    participant ? <div data-testid="edit">{participant.userId}</div> : null,
}));
vi.mock('../LeaveContestDialog', () => ({
  default: ({ contest }: { contest: unknown }) => (contest ? <div data-testid="leave" /> : null),
}));

const participants = [
  makeParticipant({ id: 'o', userId: 'owner@x.com', role: 'owner', maxSquares: 10 }),
  makeParticipant({
    id: 'p',
    userId: 'player@x.com',
    displayName: 'Pat Player',
    maxSquares: 5,
  }),
  makeParticipant({ id: 'v', userId: 'viewer@x.com', role: 'viewer', maxSquares: 0 }),
];

const owner = makeViewer({ email: 'owner@x.com', isOwner: true });

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
  });

  it('lists everyone with their role and square limit', () => {
    renderManager();
    expect(screen.getByText('player@x.com')).toBeInTheDocument();
    expect(screen.getByText('max 5 squares')).toBeInTheDocument();
    expect(screen.getAllByText(/max \d+ squares/)).toHaveLength(2);
  });

  it('shows other players by name and keeps emails for the owner', () => {
    const { unmount } = renderManager();
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.getByText('player@x.com')).toBeInTheDocument();
    unmount();

    renderManager(makeViewer({ email: 'viewer@x.com', isOwner: false }));
    expect(screen.getByText('Pat P.')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.queryByText(/@x\.com/)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Edit player@x.com' }));
    expect(screen.getByTestId('edit')).toHaveTextContent('player@x.com');
  });

  it('lets the owner remove someone after confirming', async () => {
    const [remove, state] = mockMutation(undefined);
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    const { store } = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Remove player@x.com' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'player@x.com' })
    );
    expect(store.getState().toast.messages[0]?.message).toBe('Participant removed');
  });

  it('shows why a removal failed', () => {
    api.useRemoveParticipantMutation.mockReturnValue(
      mockMutation(undefined, { error: { status: 403, message: 'Not allowed' } })
    );
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Remove player@x.com' }));
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
  });

  it('stops edits after kickoff and all changes once the contest is over', () => {
    renderManager(owner, makeContest({ status: 'Q1' }));
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove player@x.com' })).toBeInTheDocument();
  });

  it('lets a participant leave, but not change others', () => {
    renderManager(makeViewer({ email: 'player@x.com' }));
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave contest' }));
    expect(screen.getByTestId('leave')).toBeInTheDocument();
  });

  it('offers nothing once the contest is finished', () => {
    renderManager(makeViewer({ email: 'player@x.com' }), makeContest({ status: 'FINISHED' }));
    expect(screen.queryByRole('button', { name: 'Leave contest' })).not.toBeInTheDocument();
  });
});
