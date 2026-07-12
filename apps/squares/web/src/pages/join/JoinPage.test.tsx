import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer } from '../../features/toast/toastSlice';
import { contestReducer } from '../../features/contests/contestSlice';
import JoinPage from './JoinPage';
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../features/contests/contestThunks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/contests/contestThunks')>();
  return {
    ...actual,
    previewInviteToken: vi.fn(() => ({
      type: 'contests/previewInviteToken/pending',
      unwrap: () => new Promise(() => {}),
    })),
    joinContestByToken: vi.fn(() => ({
      type: 'contests/joinContestByToken/pending',
      unwrap: () => new Promise(() => {}),
    })),
  };
});

vi.mock('../../components/join/InviteSignIn', () => ({
  default: () => <div data-testid="invite-sign-in">Sign In to Join</div>,
}));

vi.mock('../../components/join/JoinError', () => ({
  default: ({ message }: { message: string }) => <div data-testid="join-error">{message}</div>,
}));

vi.mock('../../components/join/JoinNoSquares', () => ({
  default: () => <div data-testid="join-no-squares">No Squares</div>,
}));

import { useAuth } from 'react-oidc-context';
import { previewInviteToken, joinContestByToken } from '../../features/contests/contestThunks';

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({
    reducer: { toast: toastReducer, contests: contestReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
}

function renderWithToken(token = 'test-token') {
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/join/${token}`]}>
          <Routes>
            <Route path="/join/:token" element={<JoinPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('JoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading screen while auth is initializing', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    expect(screen.getByText(/redirecting to sign in/i)).toBeInTheDocument();
  });

  it('shows InviteSignIn when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    expect(screen.getByTestId('invite-sign-in')).toBeInTheDocument();
  });

  it('shows loading screen when authenticated and preview is pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    // preview is null on initial render → shows loading
    expect(screen.getByText(/loading invite/i)).toBeInTheDocument();
  });

  it('shows the loading screen while auth is initialising', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    expect(screen.getByText(/redirecting to sign in/i)).toBeInTheDocument();
  });

  it('shows JoinError when previewInviteToken rejects with a non-422 code', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/rejected',
      unwrap: () => Promise.reject({ message: 'Contest not found', code: 404 }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() => expect(screen.getByTestId('join-error')).toBeInTheDocument());
    expect(screen.getByText('Contest not found')).toBeInTheDocument();
  });

  it('shows JoinNoSquares when previewInviteToken rejects with code 422', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/rejected',
      unwrap: () => Promise.reject({ message: 'No squares available', code: 422 }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() => expect(screen.getByTestId('join-no-squares')).toBeInTheDocument());
  });

  it('shows "Joining contest..." screen after preview resolves (authenticated)', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/fulfilled',
      unwrap: () => Promise.resolve({ owner: 'alice', contestName: 'Super Bowl 2025' }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    // joinContestByToken never resolves — stays on the "Joining" screen
    vi.mocked(joinContestByToken).mockReturnValueOnce({
      type: 'contests/joinContestByToken/pending',
      unwrap: () => new Promise(() => {}),
    } as unknown as ReturnType<typeof joinContestByToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() => expect(screen.getByText('Joining contest...')).toBeInTheDocument());
  });

  it('navigates to contest page on successful join', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/fulfilled',
      unwrap: () => Promise.resolve({ owner: 'alice', contestName: 'Super Bowl 2025' }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    vi.mocked(joinContestByToken).mockReturnValueOnce({
      type: 'contests/joinContestByToken/fulfilled',
      unwrap: () => Promise.resolve({}),
    } as unknown as ReturnType<typeof joinContestByToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/contests/owner/alice/name/Super Bowl 2025', {
        replace: true,
      })
    );
  });

  it('silently redirects on 409 conflict', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/fulfilled',
      unwrap: () => Promise.resolve({ owner: 'bob', contestName: 'Playoff Pool' }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    vi.mocked(joinContestByToken).mockReturnValueOnce({
      type: 'contests/joinContestByToken/rejected',
      unwrap: () => Promise.reject({ code: 409, message: 'Already a participant' }),
    } as unknown as ReturnType<typeof joinContestByToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/contests/owner/bob/name/Playoff Pool', {
        replace: true,
      })
    );
  });

  it('shows error message when join fails with non-409 error', async () => {
    vi.mocked(previewInviteToken).mockReturnValueOnce({
      type: 'contests/previewInviteToken/fulfilled',
      unwrap: () => Promise.resolve({ owner: 'carol', contestName: 'Weekly Game' }),
    } as unknown as ReturnType<typeof previewInviteToken>);

    vi.mocked(joinContestByToken).mockReturnValueOnce({
      type: 'contests/joinContestByToken/rejected',
      unwrap: () => Promise.reject({ code: 500, message: 'Server error occurred' }),
    } as unknown as ReturnType<typeof joinContestByToken>);

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderWithToken();
    await waitFor(() => expect(screen.getByTestId('join-error')).toBeInTheDocument());
    expect(screen.getByText('Server error occurred')).toBeInTheDocument();
  });
});
