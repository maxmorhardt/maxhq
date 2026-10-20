import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../test/auth';
import { makeParticipant } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import JoinInvite from './JoinInvite';

const api = vi.hoisted(() => ({
  usePreviewInviteQuery: vi.fn(),
  useRedeemInviteMutation: vi.fn(),
}));
vi.mock('../../contests/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const preview = {
  contestId: 'c-1',
  contestName: 'Office Pool',
  maxSquares: 5,
  owner: 'o@x.com',
  role: 'participant',
};

describe('JoinInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.usePreviewInviteQuery.mockReturnValue({ data: preview, error: undefined });
    api.useRedeemInviteMutation.mockReturnValue(
      mockMutation(makeParticipant({ contestId: 'c-1' }))
    );
  });

  it('joins and opens the contest', async () => {
    const { store } = renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Joining contest...')).toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/c-1', { replace: true }));
    expect(store.getState().toast.messages[0]?.message).toBe('Successfully joined contest!');
  });

  it('waits for the invite to load', () => {
    api.usePreviewInviteQuery.mockReturnValue({ data: undefined, error: undefined });
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Loading invite...')).toBeInTheDocument();
  });

  it('opens the contest for someone already in it', async () => {
    api.useRedeemInviteMutation.mockReturnValue(
      mockMutation(
        { error: { status: 409, message: 'Already joined' } },
        { error: { status: 409, message: 'Already joined' } }
      )
    );
    renderWithProviders(<JoinInvite token="tok" />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/c-1', { replace: true }));
    expect(screen.queryByText('Unable to Join')).not.toBeInTheDocument();
  });

  it('explains an invalid invite', () => {
    api.usePreviewInviteQuery.mockReturnValue({
      data: undefined,
      error: { status: 404, message: 'Invite expired' },
    });
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Invite expired')).toBeInTheDocument();
  });

  it('explains a full contest', () => {
    api.useRedeemInviteMutation.mockReturnValue(
      mockMutation(
        { error: { status: 422, message: 'Full' } },
        { error: { status: 422, message: 'Full' } }
      )
    );
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('No Squares Available')).toBeInTheDocument();
  });

  it('reports a failed join', async () => {
    api.useRedeemInviteMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'Server down' } })
    );
    const { store } = renderWithProviders(<JoinInvite token="tok" />);
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('Server down'));
  });
});
