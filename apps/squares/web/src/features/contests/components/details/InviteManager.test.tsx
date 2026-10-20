import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Invite } from '../../../../types/contest';
import InviteManager from './InviteManager';

const api = vi.hoisted(() => ({
  useGetInvitesQuery: vi.fn(),
  useCreateInviteMutation: vi.fn(),
  useDeleteInviteMutation: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const invite = (overrides: Partial<Invite> = {}): Invite => ({
  id: 'i-1',
  contestId: 'c-1',
  token: 'tok',
  maxSquares: 5,
  role: 'participant',
  uses: 1,
  maxUses: 3,
  expiresAt: '2026-02-01T00:00:00Z',
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  ...overrides,
});

const renderManager = (contest: Contest = makeContest()) =>
  renderWithProviders(<InviteManager open onClose={vi.fn()} contest={contest} />);

describe('InviteManager', () => {
  beforeEach(() => {
    api.useGetInvitesQuery.mockReturnValue({ data: [invite()], isLoading: false });
    api.useCreateInviteMutation.mockReturnValue(mockMutation(invite()));
    api.useDeleteInviteMutation.mockReturnValue(mockMutation(undefined));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists active invites with their limits', () => {
    renderManager();
    expect(screen.getByText('5 sq/person · participant')).toBeInTheDocument();
    expect(screen.getByText(/1\/3 uses/)).toBeInTheDocument();
  });

  it('only fetches invites while open', () => {
    renderWithProviders(<InviteManager open={false} onClose={vi.fn()} contest={makeContest()} />);
    expect(api.useGetInvitesQuery).toHaveBeenCalledWith('c-1', { skip: true });
  });

  it('creates a participant invite with optional limits', async () => {
    const [create, state] = mockMutation(invite());
    api.useCreateInviteMutation.mockReturnValue([create, state]);
    renderManager();

    fireEvent.change(screen.getByLabelText('Max Uses (optional)'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Expires In (min)'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Invite Link' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        contestId: 'c-1',
        request: { maxSquares: 10, role: 'participant', maxUses: 4, expiresIn: 60 },
      })
    );
  });

  it('offers a retry after a failed create', () => {
    api.useCreateInviteMutation.mockReturnValue(mockMutation(invite(), { isError: true }));
    renderManager();
    expect(screen.getByRole('button', { name: 'Failed, Retry' })).toBeInTheDocument();
  });

  it('deletes an invite and flags one that failed to delete', async () => {
    const [remove, state] = mockMutation({ error: { status: 500, message: 'x' } });
    api.useDeleteInviteMutation.mockReturnValue([remove, state]);
    renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Delete invite' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete failed, retry' })).toBeInTheDocument()
    );
    expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', inviteId: 'i-1' });
  });

  it('copies the link when the browser cannot share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { store } = renderManager();

    fireEvent.click(screen.getByRole('button', { name: 'Share link' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/tok`)
    );
    expect(store.getState().toast.messages[0]?.message).toBe('Invite link copied to clipboard');
  });

  it('uses the share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Share link' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
  });

  it('freezes invites once the contest is over', () => {
    renderManager(makeContest({ status: 'FINISHED' }));
    expect(screen.getByText(/Invite links can no longer be created/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete invite' })).not.toBeInTheDocument();
  });

  it('shows a spinner while invites load', () => {
    api.useGetInvitesQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderManager();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
