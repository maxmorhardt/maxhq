import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import InviteLinkDialog from './InviteLinkDialog';

const api = vi.hoisted(() => ({
  useGetInviteLinkQuery: vi.fn(),
  useResetInviteLinkMutation: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const faro = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('../../../../utils/faro', () => faro);

const link = `${window.location.origin}/join/tok`;

const renderDialog = (contest: Contest = makeContest()) =>
  renderWithProviders(<InviteLinkDialog open onClose={vi.fn()} contest={contest} />);

describe('InviteLinkDialog', () => {
  beforeEach(() => {
    faro.trackEvent.mockClear();
    api.useGetInviteLinkQuery.mockReturnValue({ data: { token: 'tok' }, isLoading: false });
    api.useResetInviteLinkMutation.mockReturnValue(mockMutation({ token: 'fresh' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the contest link and how joining works', () => {
    renderDialog();
    expect(screen.getByLabelText('Invite link')).toHaveValue(link);
    expect(screen.getByText(/They start with no squares/)).toBeInTheDocument();
  });

  it('only fetches the link while open', () => {
    renderWithProviders(
      <InviteLinkDialog open={false} onClose={vi.fn()} contest={makeContest()} />
    );
    expect(api.useGetInviteLinkQuery).toHaveBeenCalledWith('c-1', { skip: true });
  });

  it('copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { store } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(link));
    expect(store.getState().toast.messages[0]?.message).toBe('Invite link copied');
    expect(faro.trackEvent).toHaveBeenCalledWith('invite_share', { method: 'copy' });
  });

  it('says so when copying fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) },
    });
    const { store } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Failed to copy link')
    );
    expect(faro.trackEvent).not.toHaveBeenCalled();
  });

  it('opens the share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Test Bowl', url: link }));
    await waitFor(() =>
      expect(faro.trackEvent).toHaveBeenCalledWith('invite_share', { method: 'share' })
    );
  });

  it('counts nothing when the share sheet is closed', async () => {
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    vi.stubGlobal('navigator', { share });
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(faro.trackEvent).not.toHaveBeenCalled();
  });

  it('copies instead when the browser cannot share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(link));
  });

  it('resets the link after a confirm', async () => {
    const [resetLink, state] = mockMutation({ token: 'fresh' });
    api.useResetInviteLinkMutation.mockReturnValue([resetLink, state]);
    const { store } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Link' }));
    expect(screen.getByText(/current link stops working/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => expect(resetLink).toHaveBeenCalledWith('c-1'));
    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Invite link reset')
    );
  });

  it('keeps the confirm open with the error when a reset fails', async () => {
    api.useResetInviteLinkMutation.mockReturnValue(
      mockMutation(
        { error: { status: 500, message: 'x' } },
        { error: { status: 500, message: 'down' } }
      )
    );
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(await screen.findByText('down')).toBeInTheDocument();
  });

  it('shows a spinner while the link loads, and the error if it fails', () => {
    api.useGetInviteLinkQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { unmount } = renderDialog();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();

    api.useGetInviteLinkQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, message: 'no link' },
    });
    renderDialog();
    expect(screen.getByText('no link')).toBeInTheDocument();
  });

  it('hides the link once the contest is over', () => {
    renderDialog(makeContest({ status: 'FINISHED' }));
    expect(screen.getByText(/nobody new can join/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Invite link')).not.toBeInTheDocument();
  });
});
