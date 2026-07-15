import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import type { UserActiveContest } from '../../types/user';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();
const mockRemoveUser = vi.fn().mockResolvedValue(undefined);
const mockDispatch = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useAxiosAuth', () => ({ useAxiosAuth: () => true }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
vi.mock('../../hooks/reduxHooks', () => ({ useAppDispatch: () => mockDispatch }));
vi.mock('../../features/contests/contestThunks', () => ({
  deleteContest: vi.fn((id: string) => ({ type: 'deleteContest', id })),
  removeContestParticipant: vi.fn((arg) => ({ type: 'removeParticipant', arg })),
}));
vi.mock('../../service/userService', () => ({
  getMyProfile: vi.fn(),
  getMyStats: vi.fn(),
  getMyActiveContests: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';
import { deleteContest, removeContestParticipant } from '../../features/contests/contestThunks';
import {
  deleteMyAccount,
  getMyActiveContests,
  getMyProfile,
  getMyStats,
} from '../../service/userService';

const theme = createTheme();

const mockProfile = { email: 'a@b.com', displayName: 'Max', createdAt: '2026-07-11T00:00:00Z' };
const mockStats = { contestsCreated: 3, contestsJoined: 7, squaresClaimed: 42, quarterWins: 5 };

function renderPage() {
  return render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

async function openDeleteDialog() {
  const button = await screen.findByRole('button', {
    name: /delete account/i,
  });

  await act(async () => {
    fireEvent.click(button);
  });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockReturnValue({ unwrap: () => Promise.resolve() });
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      removeUser: mockRemoveUser,
      user: { profile: { email: 'a@b.com' } },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(getMyProfile).mockResolvedValue(mockProfile);
    vi.mocked(getMyStats).mockResolvedValue(mockStats);
    vi.mocked(getMyActiveContests).mockResolvedValue([]);
  });

  it('renders profile info after loading', async () => {
    renderPage();
    expect(await screen.findByText('Max')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  it('renders the stats', async () => {
    renderPage();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/12% win rate/i)).toBeInTheDocument();
  });

  it('shows a top-of-page error and disables account deletion when loading fails', async () => {
    vi.mocked(getMyProfile).mockRejectedValueOnce(new Error('down'));
    renderPage();
    expect(await screen.findByText(/couldn't load your profile/i)).toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows the delete button after the preflight finds no active contests', async () => {
    renderPage();
    await openDeleteDialog();
    expect(await screen.findByRole('button', { name: /delete forever/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(getMyActiveContests).toHaveBeenCalled();
    });
  });

  it('blocks deletion and offers a retry when the active-contests preflight fails', async () => {
    vi.mocked(getMyActiveContests).mockRejectedValueOnce(new Error('down'));
    renderPage();

    await openDeleteDialog();
    expect(await screen.findByText(/couldn't verify/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete forever/i })).not.toBeInTheDocument();

    vi.mocked(getMyActiveContests).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('button', { name: /delete forever/i })).toBeInTheDocument();
  });

  it('deletes the account, clears the session, and navigates home', async () => {
    vi.mocked(deleteMyAccount).mockResolvedValue(undefined);
    renderPage();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole('button', { name: /delete forever/i }));

    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalled());
    await waitFor(() => expect(mockRemoveUser).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('lists blocking contests with per-item actions and hides delete', async () => {
    const active: UserActiveContest[] = [
      { id: 'c1', name: 'pool', owner: 'a@b.com', role: 'owner' },
      { id: 'c2', name: 'office', owner: 'other@b.com', role: 'participant' },
    ];
    vi.mocked(getMyActiveContests).mockResolvedValue(active);
    renderPage();

    await openDeleteDialog();
    expect(await screen.findByText(/finish your contests first/i)).toBeInTheDocument();
    expect(screen.getByText('pool')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete forever/i })).not.toBeInTheDocument();
  });

  it('deletes an owned blocking contest then reveals the delete button once clear', async () => {
    vi.mocked(getMyActiveContests)
      .mockResolvedValueOnce([{ id: 'c1', name: 'pool', owner: 'a@b.com', role: 'owner' }])
      .mockResolvedValueOnce([]);
    renderPage();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(deleteContest).toHaveBeenCalledWith('c1'));
    expect(await screen.findByRole('button', { name: /delete forever/i })).toBeInTheDocument();
  });

  it('leaves a joined blocking contest', async () => {
    vi.mocked(getMyActiveContests)
      .mockResolvedValueOnce([
        { id: 'c2', name: 'office', owner: 'other@b.com', role: 'participant' },
      ])
      .mockResolvedValueOnce([]);
    renderPage();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole('button', { name: /leave/i }));

    await waitFor(() =>
      expect(removeContestParticipant).toHaveBeenCalledWith({ contestId: 'c2', userId: 'a@b.com' })
    );
  });

  it('shows an inline dialog error when account deletion fails', async () => {
    vi.mocked(deleteMyAccount).mockRejectedValue(new Error('down'));
    renderPage();

    await openDeleteDialog();
    fireEvent.click(await screen.findByRole('button', { name: /delete forever/i }));

    expect(await screen.findByText(/failed to delete your account/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockShowToast).not.toHaveBeenCalledWith('Failed to delete your account', 'error');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('shows the unauthorized page when signed out', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      signinRedirect: vi.fn(),
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(getMyProfile).not.toHaveBeenCalled();
  });
});
