import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();
const mockRemoveUser = vi.fn().mockResolvedValue(undefined);

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useAxiosAuth', () => ({ useAxiosAuth: () => true }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
vi.mock('../../service/userService', () => ({
  getMyProfile: vi.fn(),
  getMyStats: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';
import { deleteMyAccount, getMyProfile, getMyStats } from '../../service/userService';

const theme = createTheme();

const mockProfile = {
  email: 'a@b.com',
  displayName: 'Max',
  createdAt: '2026-07-11T00:00:00Z',
};

const mockStats = {
  contestsCreated: 3,
  contestsJoined: 7,
  squaresClaimed: 42,
  quarterWins: 5,
};

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

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      removeUser: mockRemoveUser,
      user: { profile: { email: 'a@b.com' } },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(getMyProfile).mockResolvedValue(mockProfile);
    vi.mocked(getMyStats).mockResolvedValue(mockStats);
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

  it('shows a toast when loading fails', async () => {
    vi.mocked(getMyProfile).mockRejectedValue(new Error('down'));
    renderPage();
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Failed to load your profile', 'error')
    );
  });

  it('opens the delete confirmation dialog', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    expect(screen.getByText(/delete your account\?/i)).toBeInTheDocument();
  });

  it('deletes the account, clears the session, and navigates home', async () => {
    vi.mocked(deleteMyAccount).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));

    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalled());
    await waitFor(() => expect(mockRemoveUser).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows a toast when deletion fails', async () => {
    vi.mocked(deleteMyAccount).mockRejectedValue(new Error('down'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Failed to delete your account', 'error')
    );
    expect(mockNavigate).not.toHaveBeenCalled();
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
