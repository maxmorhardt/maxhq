import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { leaderboardReducer } from '../../features/leaderboard/leaderboardSlice';
import { userReducer } from '../../features/user/userSlice';
import LeaderboardPage from './LeaderboardPage';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetLeaderboard = vi.fn();
const mockGetMyRank = vi.fn();
vi.mock('../../service/leaderboardService', () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
  getMyRank: (...args: unknown[]) => mockGetMyRank(...args),
}));

let mockIsAuthenticated = false;
vi.mock('react-oidc-context', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('../../hooks/useAxiosAuth', () => ({
  useAxiosAuth: () => true,
}));

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage(profileName?: string) {
  const store = configureStore({
    reducer: { leaderboard: leaderboardReducer, user: userReducer },
    preloadedState: profileName
      ? {
          user: {
            profile: {
              email: 'a@b.com',
              displayName: profileName,
              defaultInitials: 'MM',
              createdAt: '2026-07-11T00:00:00Z',
            },
            loading: false,
            error: null,
            stats: null,
            statsLoading: false,
            statsError: false,
          },
        }
      : undefined,
  });

  return render(
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <MemoryRouter>
          <LeaderboardPage />
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated = false;
  mockGetLeaderboard.mockResolvedValue({
    entries: [
      { rank: 1, displayName: 'Max M.', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
      { rank: 2, displayName: 'Jordan K.', quarterWins: 9, squaresClaimed: 40, quartersPlayed: 40 },
      { rank: 3, displayName: 'Sam R.', quarterWins: 7, squaresClaimed: 30, quartersPlayed: 30 },
      { rank: 4, displayName: 'Riley P.', quarterWins: 5, squaresClaimed: 25, quartersPlayed: 25 },
    ],
  });
  mockGetMyRank.mockResolvedValue({ rank: 7, totalRanked: 143, quarterWins: 5, ranked: true });
});

describe('LeaderboardPage', () => {
  it('renders the heading', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('renders the top three on the podium and the rest in the table', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Max M.')).toBeInTheDocument());
    expect(screen.getByText('Sam R.')).toBeInTheDocument();
    expect(screen.getByText('Riley P.')).toBeInTheDocument();
    expect(mockGetLeaderboard).toHaveBeenCalled();
  });

  it('lists players without a podium when there are fewer than three', async () => {
    mockGetLeaderboard.mockResolvedValue({
      entries: [
        { rank: 1, displayName: 'Max M.', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
        {
          rank: 2,
          displayName: 'Jordan K.',
          quarterWins: 9,
          squaresClaimed: 40,
          quartersPlayed: 40,
        },
      ],
    });

    renderPage();

    // both appear in the table, and no empty state leaks through
    await waitFor(() => expect(screen.getByText('Max M.')).toBeInTheDocument());
    expect(screen.getByText('Jordan K.')).toBeInTheDocument();
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.queryByText('No winners yet')).not.toBeInTheDocument();
  });

  it('does not link back to itself from the rank card', async () => {
    mockIsAuthenticated = true;

    renderPage();

    await waitFor(() => expect(screen.getByText("You're #7 of 143")).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /view leaderboard/i })).not.toBeInTheDocument();
  });

  it('shows the empty state when nobody has won', async () => {
    mockGetLeaderboard.mockResolvedValue({ entries: [] });

    renderPage();

    await waitFor(() => expect(screen.getByText('No winners yet')).toBeInTheDocument());
  });

  it('does not fetch the user rank when signed out', async () => {
    renderPage();

    await waitFor(() => expect(mockGetLeaderboard).toHaveBeenCalled());
    expect(mockGetMyRank).not.toHaveBeenCalled();
  });

  it('fetches and shows the user rank when signed in', async () => {
    mockIsAuthenticated = true;
    renderPage();

    await waitFor(() => expect(screen.getByText("You're #7 of 143")).toBeInTheDocument());
  });

  it('marks the signed-in user, matching the abbreviated name the API returns', async () => {
    mockIsAuthenticated = true;
    mockGetMyRank.mockResolvedValue({ rank: 2, totalRanked: 143, quarterWins: 9, ranked: true });

    // the profile holds the full name while the API returns "Jordan K."
    renderPage('Jordan Kim');

    await waitFor(() => expect(screen.getByText('You')).toBeInTheDocument());
  });

  it('marks nobody when the user is unranked', async () => {
    mockIsAuthenticated = true;
    mockGetMyRank.mockResolvedValue({ rank: 0, totalRanked: 143, quarterWins: 0, ranked: false });

    renderPage('Jordan Kim');

    await waitFor(() => expect(screen.getByText('Max M.')).toBeInTheDocument());
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('shows an error when the fetch fails', async () => {
    mockGetLeaderboard.mockRejectedValue({
      code: 500,
      message: 'fail',
      timestamp: '',
      requestId: '',
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/couldn't load the leaderboard/i)).toBeInTheDocument()
    );
  });
});
