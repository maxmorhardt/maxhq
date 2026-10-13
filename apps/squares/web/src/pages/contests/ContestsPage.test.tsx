import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { contestReducer } from '../../features/contests/contestSlice';
import { toastReducer } from '../../features/toast/toastSlice';
import type { ContestSummary } from '../../types/contest';
import ContestsPage from './ContestsPage';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../hooks/useAxiosAuth', () => ({ useAxiosAuth: vi.fn(() => true) }));

vi.mock('../../service/contestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/contestService')>();
  return { ...actual, getContestFeed: vi.fn() };
});

vi.mock('../../components/contest/table/ContestsTable', () => ({
  default: ({
    contests,
    footer,
    emptyTitle,
  }: {
    contests: ContestSummary[];
    footer?: ReactNode;
    emptyTitle?: string;
  }) => (
    <div data-testid="table">
      {contests.map((c) => (
        <div key={c.id}>{c.name}</div>
      ))}
      {contests.length === 0 && <div>{emptyTitle ?? 'No contests yet'}</div>}
      {footer}
    </div>
  ),
}));
vi.mock('../../components/contest/table/ContestsTableSkeleton', () => ({
  default: () => <div data-testid="skeleton" />,
}));

import { useAuth } from 'react-oidc-context';
import { getContestFeed } from '../../service/contestService';

const theme = createTheme({ palette: { mode: 'dark' } });

const row = (id: string, name = id): ContestSummary => ({
  id,
  name,
  status: 'ACTIVE',
  visibility: 'private',
  owner: 'user1',
  role: 'owner',
  claimedSquares: 0,
  mySquares: 0,
  version: 1,
  createdAt: '',
  updatedAt: '',
});

function signedIn(authenticated = true) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: authenticated,
    isLoading: false,
    activeNavigator: undefined,
    user: authenticated ? { profile: { email: 'user1' } } : null,
  } as unknown as ReturnType<typeof useAuth>);
}

function renderPage(preloaded?: { contest: ReturnType<typeof contestReducer> }) {
  const store = configureStore({
    reducer: { contest: contestReducer, toast: toastReducer },
    preloadedState: preloaded,
  });
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ContestsPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
}

let observerCallback: IntersectionObserverCallback | undefined;

class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    observerCallback = cb;
  }
  observe() {}
  disconnect() {}
}

function scrollToBottom() {
  act(() => {
    observerCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
}

describe('ContestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = undefined;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.mocked(getContestFeed).mockResolvedValue({ contests: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks signed-out visitors to sign in without fetching', () => {
    signedIn(false);
    renderPage();
    expect(screen.getByText('Contests')).toBeInTheDocument();
    expect(screen.getByText('Sign in to view your contests')).toBeInTheDocument();
    expect(getContestFeed).not.toHaveBeenCalled();
  });

  it('shows a redirecting screen while a sign-in redirect is in progress', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: 'signinRedirect',
    } as unknown as ReturnType<typeof useAuth>);
    renderPage();
    expect(screen.getByText('Redirecting to sign in...')).toBeInTheDocument();
  });

  it('shows a skeleton until the first page arrives', () => {
    signedIn();
    vi.mocked(getContestFeed).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders a cached feed immediately while it revalidates', () => {
    signedIn();
    vi.mocked(getContestFeed).mockReturnValue(new Promise(() => {}));
    const contest = contestReducer(undefined, { type: '@@INIT' });
    renderPage({
      contest: { ...contest, feed: { ...contest.feed, items: [row('c1', 'Cached')] } },
    });
    expect(screen.getByText('Cached')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });

  it('loads the first page, then the next one on scroll', async () => {
    signedIn();
    vi.mocked(getContestFeed)
      .mockResolvedValueOnce({ contests: [row('c1', 'First')], nextCursor: 'next' })
      .mockResolvedValueOnce({ contests: [row('c2', 'Second')] });
    renderPage();

    await screen.findByText('First');
    expect(getContestFeed).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, sort: 'updated' })
    );

    scrollToBottom();

    await screen.findByText('Second');
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(getContestFeed).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'next' }));
  });

  it('does not load more once the last page is reached', async () => {
    signedIn();
    vi.mocked(getContestFeed).mockResolvedValue({ contests: [row('c1')] });
    renderPage();
    await screen.findByText('c1');

    scrollToBottom();

    expect(getContestFeed).toHaveBeenCalledTimes(1);
  });

  it('refetches from the start when filters change', async () => {
    signedIn();
    renderPage();
    await waitFor(() => expect(getContestFeed).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Joined' }));
    await waitFor(() =>
      expect(getContestFeed).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'joined' }))
    );

    fireEvent.click(screen.getByText('Live'));
    await waitFor(() =>
      expect(getContestFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'joined', status: ['live'] })
      )
    );
    expect(await screen.findByText('No contests match these filters')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Live'));
    await waitFor(() =>
      expect(getContestFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined })
      )
    );
  });

  it('debounces search', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    signedIn();
    renderPage();
    await waitFor(() => expect(getContestFeed).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Search contests...'), { target: { value: 'b' } });
    fireEvent.change(screen.getByPlaceholderText('Search contests...'), {
      target: { value: ' bowl ' },
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    await waitFor(() =>
      expect(getContestFeed).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bowl' }))
    );
    expect(getContestFeed).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('navigates to the create page', async () => {
    signedIn();
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /create contest/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/create');
  });

  it('shows and clears a fetch error', async () => {
    signedIn();
    vi.mocked(getContestFeed).mockRejectedValueOnce({
      code: 500,
      message: 'fetch failed',
      timestamp: '',
      requestId: '',
    });
    renderPage();

    expect(await screen.findByText('fetch failed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText('fetch failed')).not.toBeInTheDocument());
  });
});
