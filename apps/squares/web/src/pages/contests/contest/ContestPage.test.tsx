import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../../features/contests/contestSlice';
import { wsReducer } from '../../../features/ws/wsSlice';
import { toastReducer } from '../../../features/toast/toastSlice';
import ContestPage from './ContestPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockWebSocket = {
  activityEvents: [],
  chatMessages: [],
  sendChatMessage: vi.fn(),
  isConnected: false,
  isConnecting: true,
  connectionFailed: false,
  connectionStatus: 'connecting' as const,
  retryCount: 0,
  wsCloseCode: null,
  hasFatalWsError: false,
  forceReconnect: vi.fn(),
};

vi.mock('../../../hooks/useContestWebSocket', () => ({
  useContestWebSocket: vi.fn(() => mockWebSocket),
}));

vi.mock('../../../components/contest/ContestPageSkeleton', () => ({
  default: ({ connectionStatus }: { connectionStatus: string }) => (
    <div data-testid="contest-skeleton">Skeleton - {connectionStatus}</div>
  ),
}));
vi.mock('../../../components/contest/GenericErrorDisplay', () => ({
  default: () => <div data-testid="generic-error">Generic Error</div>,
}));
vi.mock('../../../components/contest/grid/Contest', () => ({
  default: () => <div data-testid="contest-grid">Contest Grid</div>,
}));
vi.mock('../../../components/contest/details/ContestDetails', () => ({
  default: () => <div data-testid="contest-details">Contest Details</div>,
}));
vi.mock('../../../components/contest/sidebar/ActivityFeed', () => ({
  default: () => <div data-testid="activity-feed">Activity Feed</div>,
}));
vi.mock('../../../components/contest/sidebar/LiveChat', () => ({
  default: () => <div data-testid="live-chat">Live Chat</div>,
}));
vi.mock('../../../components/contest/sidebar/WinnersBoard', () => ({
  default: () => <div data-testid="winners-board">Winners Board</div>,
}));
vi.mock('../../../components/contest/WinnerCelebrationDialog', () => ({
  default: () => null,
}));
vi.mock('../../../components/contest/ConnectionChip', () => ({
  default: () => <div data-testid="connection-chip" />,
}));
vi.mock('../../error/UnauthorizedPage', () => ({
  default: () => <div data-testid="unauthorized-page">Unauthorized</div>,
}));
vi.mock('../../error/ForbiddenPage', () => ({
  default: () => <div data-testid="forbidden-page">Forbidden</div>,
}));
vi.mock('../../error/NotFoundPage', () => ({
  default: () => <div data-testid="not-found-page">Not Found</div>,
}));

import { useAuth } from 'react-oidc-context';
import { useContestWebSocket } from '../../../hooks/useContestWebSocket';

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore(currentContest?: unknown) {
  const baseState = contestReducer(undefined, { type: '' });
  const preloadedContest = currentContest ? { ...baseState, currentContest } : undefined;
  const store = // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (configureStore as unknown as (...args: any[]) => ReturnType<typeof configureStore>)({
      reducer: { contest: contestReducer, ws: wsReducer, toast: toastReducer },
      preloadedState: preloadedContest ? { contest: preloadedContest } : undefined,
    });
  return store;
}

function renderPage(store = createTestStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/contests/c1']}>
          <Routes>
            <Route path="/contests/:id" element={<ContestPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('ContestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { email: 'user1', name: 'User One' } },
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useContestWebSocket).mockReturnValue(mockWebSocket);
  });

  it('shows UnauthorizedPage when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
  });

  it('shows a redirecting screen while a sign-in redirect is in progress', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: 'signinRedirect',
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByText('Redirecting to sign in...')).toBeInTheDocument();
  });

  it('shows skeleton while connecting', () => {
    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: true,
      isConnected: false,
    });

    renderPage();
    expect(screen.getByTestId('contest-skeleton')).toBeInTheDocument();
  });

  it('shows GenericErrorDisplay when connection has failed', () => {
    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: false,
      isConnected: true,
      connectionFailed: true,
    });

    renderPage();
    expect(screen.getByTestId('generic-error')).toBeInTheDocument();
  });

  it('shows ForbiddenPage on fatal WS close code 4403', () => {
    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: false,
      isConnected: true,
      connectionFailed: false,
      hasFatalWsError: true,
      wsCloseCode: 4403,
    });

    renderPage();
    expect(screen.getByTestId('forbidden-page')).toBeInTheDocument();
  });

  it('shows NotFoundPage on fatal WS close code 4404', () => {
    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: false,
      isConnected: true,
      connectionFailed: false,
      hasFatalWsError: true,
      wsCloseCode: 4404,
    });

    renderPage();
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
  });

  it('renders the contest grid when connected and contest is loaded', () => {
    const contestData = {
      id: '1',
      name: 'Super Bowl',
      owner: 'user1',
      status: 'ACTIVE',
      squares: [],
      quarterResults: [],
      visibility: 'public',
      maxSquares: 10,
    };
    const store = createTestStore(contestData);

    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: false,
      isConnected: true,
      connectionFailed: false,
      hasFatalWsError: false,
    });

    renderPage(store);
    expect(screen.getByTestId('contest-grid')).toBeInTheDocument();
  });

  it('renders the contest name heading when connected', () => {
    const contestData = {
      id: '1',
      name: 'Super Bowl',
      owner: 'user1',
      status: 'ACTIVE',
      squares: [],
      quarterResults: [],
      visibility: 'public',
      maxSquares: 10,
    };
    const store = createTestStore(contestData);

    vi.mocked(useContestWebSocket).mockReturnValue({
      ...mockWebSocket,
      isConnecting: false,
      isConnected: true,
      connectionFailed: false,
      hasFatalWsError: false,
    });

    renderPage(store);
    expect(screen.getByText('Super Bowl')).toBeInTheDocument();
  });
});
