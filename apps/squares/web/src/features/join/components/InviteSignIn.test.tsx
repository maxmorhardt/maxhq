import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/render';
import type { InvitePreviewResponse } from '../../../types/contest';
import { formatKickoff } from '../../../utils/game';
import InviteSignIn from './InviteSignIn';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
import { useAuth } from 'react-oidc-context';

const api = vi.hoisted(() => ({ usePreviewInviteQuery: vi.fn() }));
vi.mock('../../contests/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));

const preview: InvitePreviewResponse = {
  contestId: 'c-1',
  contestName: 'Office Pool',
  maxSquares: 10,
  owner: 'owner@x.com',
  role: 'participant',
  status: 'ACTIVE',
  claimedSquares: 42,
  totalSquares: 100,
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  homeAbbr: 'DET',
  awayAbbr: 'CHI',
  gameTime: '2026-11-01T18:00:00Z',
};

const loaded = (data: Partial<InvitePreviewResponse> = {}) =>
  api.usePreviewInviteQuery.mockReturnValue({
    data: { ...preview, ...data },
    error: undefined,
    isLoading: false,
  });

describe('InviteSignIn', () => {
  const signinRedirect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ signinRedirect } as unknown as ReturnType<typeof useAuth>);
    loaded();
  });

  it('previews the contest the invite leads to', () => {
    renderWithProviders(<InviteSignIn token="tok" />);

    expect(api.usePreviewInviteQuery).toHaveBeenCalledWith('tok');
    expect(screen.getByRole('heading', { level: 1, name: 'Office Pool' })).toBeInTheDocument();
    expect(screen.getByText('Bears at Lions')).toBeInTheDocument();
    expect(screen.getByText(`Kickoff ${formatKickoff(preview.gameTime!)}`)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toHaveTextContent('42/100 claimed');
    expect(screen.getByText('You can claim up to 10 of the 58 open squares.')).toBeInTheDocument();
  });

  it('says when the board is full or the game has started', () => {
    loaded({ claimedSquares: 100 });
    const { unmount } = renderWithProviders(<InviteSignIn token="tok" />);
    expect(screen.getByText(/The board is full and locked/)).toBeInTheDocument();
    unmount();

    loaded({ status: 'Q2', homeTeam: undefined, awayTeam: undefined, gameTime: undefined });
    renderWithProviders(<InviteSignIn token="tok" />);
    expect(screen.getByText(/The game is underway/)).toBeInTheDocument();
    expect(screen.queryByText(/ at /)).not.toBeInTheDocument();
  });

  it('signs in with either provider and comes back to the invite', () => {
    window.history.pushState({}, '', '/join/tok');
    renderWithProviders(<InviteSignIn token="tok" />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(signinRedirect).toHaveBeenLastCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/join/tok');

    fireEvent.click(screen.getByRole('button', { name: 'Continue with GitHub' }));
    expect(signinRedirect).toHaveBeenLastCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });

  it('shows placeholders while the invite loads', () => {
    api.usePreviewInviteQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    renderWithProviders(<InviteSignIn token="tok" />);
    expect(screen.getByTestId('invite-preview-loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  it('explains an invite that no longer works', () => {
    api.usePreviewInviteQuery.mockReturnValue({
      data: undefined,
      error: { status: 410, data: { message: 'This invite has expired' } },
      isLoading: false,
    });
    renderWithProviders(<InviteSignIn token="tok" />);
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
  });
});
