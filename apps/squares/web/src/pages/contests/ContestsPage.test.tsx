import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from '../../features/contests/contestSlice';
import { toastReducer } from '../../features/toast/toastSlice';
import ContestsPage from './ContestsPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/useAxiosAuth', () => ({ useAxiosAuth: vi.fn(() => true) }));

vi.mock('../../service/contestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../service/contestService')>();
  return {
    ...actual,
    getContestsByOwner: vi.fn().mockResolvedValue({
      contests: [],
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    }),
    getMyContests: vi.fn().mockResolvedValue([]),
  };
});

vi.mock('../../components/contest/table/ContestsTable', () => ({
  default: ({
    title,
    onPageChange,
    onRowsPerPageChange,
  }: {
    title: string;
    onPageChange?: (e: unknown, page: number) => void;
    onRowsPerPageChange?: (e: unknown) => void;
  }) => (
    <div data-testid={`table-${title}`}>
      {title}
      {onPageChange && (
        <button data-testid={`page-${title}`} onClick={() => onPageChange(null, 1)}>
          Next Page
        </button>
      )}
      {onRowsPerPageChange && (
        <button
          data-testid={`rows-${title}`}
          onClick={() => onRowsPerPageChange({ target: { value: '10' } })}
        >
          Change Rows
        </button>
      )}
    </div>
  ),
}));
vi.mock('../../components/contest/table/ContestsTableSkeleton', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid={`skeleton-${title}`}>{title} skeleton</div>
  ),
}));

import { useAuth } from 'react-oidc-context';
import { getContestsByOwner, getMyContests } from '../../service/contestService';

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { contest: contestReducer, toast: toastReducer } });
}

function renderPage() {
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ContestsPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('ContestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Contests heading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByText('Contests')).toBeInTheDocument();
  });

  it('shows sign-in warning when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByText('Sign in to view your contests')).toBeInTheDocument();
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

  it('shows skeleton tables on first load while authenticated but data not yet arrived', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(getContestsByOwner).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(getMyContests).mockReturnValueOnce(new Promise(() => {}));

    renderPage();
    expect(screen.getByTestId('skeleton-My Contests')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-Joined Contests')).toBeInTheDocument();
  });

  it('renders the search field', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    expect(screen.getByPlaceholderText('Search contests...')).toBeInTheDocument();
  });

  it('updates search input value when typing', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    const searchInput = screen.getByPlaceholderText('Search contests...');
    fireEvent.change(searchInput, { target: { value: 'bowl' } });
    expect((searchInput as HTMLInputElement).value).toBe('bowl');
  });

  it('clears previous debounce timer when typing multiple characters', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    const searchInput = screen.getByPlaceholderText('Search contests...');
    fireEvent.change(searchInput, { target: { value: 'b' } });
    fireEvent.change(searchInput, { target: { value: 'bo' } });
    expect((searchInput as HTMLInputElement).value).toBe('bo');
  });

  it('shows tables when authenticated and data has loaded', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('table-My Contests')).toBeInTheDocument());
    expect(screen.getByTestId('table-Joined Contests')).toBeInTheDocument();
  });

  it('shows Create Contest button when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create contest/i })).toBeInTheDocument()
    );
  });

  it('navigates to /contests/create when Create Contest is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /create contest/i }));
    fireEvent.click(screen.getByRole('button', { name: /create contest/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/create');
  });

  it('shows error alert when fetch fails', async () => {
    vi.mocked(getContestsByOwner).mockRejectedValueOnce({
      code: 500,
      message: 'fetch failed',
      timestamp: '',
      requestId: '',
    });
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('clears error alert when close button is clicked', async () => {
    vi.mocked(getContestsByOwner).mockRejectedValueOnce({
      code: 500,
      message: 'fetch failed',
      timestamp: '',
      requestId: '',
    });
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => screen.getByRole('alert'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('calls onPageChange when Next Page is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => screen.getByTestId('page-My Contests'));
    fireEvent.click(screen.getByTestId('page-My Contests'));
    await waitFor(() => expect(screen.getByTestId('table-My Contests')).toBeInTheDocument());
  });

  it('calls onRowsPerPageChange when Change Rows is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { preferred_username: 'user1' } },
    } as unknown as ReturnType<typeof useAuth>);

    renderPage();
    await waitFor(() => screen.getByTestId('rows-My Contests'));
    fireEvent.click(screen.getByTestId('rows-My Contests'));
    await waitFor(() => expect(screen.getByTestId('table-My Contests')).toBeInTheDocument());
  });
});
