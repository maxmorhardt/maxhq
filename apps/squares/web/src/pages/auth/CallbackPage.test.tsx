import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer } from '../../features/toast/toastSlice';
import CallbackPage from './CallbackPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme({ palette: { mode: 'dark' } });

function createTestStore() {
  return configureStore({ reducer: { toast: toastReducer } });
}

function renderPage(searchString = '') {
  return render(
    <Provider store={createTestStore()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/auth/callback${searchString}`]}>
          <CallbackPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

describe('CallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the loading animation while auth is loading', () => {
    renderPage('?code=abc&state=xyz');
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
  });

  it('navigates home when no code or state params are present', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage('');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('navigates to redirect path when auth completes (deferred until intro finishes)', () => {
    sessionStorage.setItem('auth_redirect_path', '/contests/c-1');
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage('?code=abc&state=xyz');

    // navigation must not fire synchronously on render
    expect(mockNavigate).not.toHaveBeenCalled();

    // advance past MIN_DISPLAY_MS; noop act() in between forces React to flush effects
    act(() => vi.advanceTimersByTime(1600));
    act(() => {}); // flush React renders triggered by setMinTimePassed
    act(() => vi.advanceTimersByTime(700));
    act(() => {}); // flush any remaining effects

    expect(mockNavigate).toHaveBeenCalledWith('/contests/c-1', { replace: true });
  });

  it('falls back to /contests when no redirect path is stored', () => {
    sessionStorage.removeItem('auth_redirect_path');
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage('?code=abc&state=xyz');

    act(() => vi.advanceTimersByTime(1600));
    act(() => {});
    act(() => vi.advanceTimersByTime(700));
    act(() => {});

    expect(mockNavigate).toHaveBeenCalledWith('/contests', { replace: true });
  });

  it('navigates home on auth error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      error: new Error('Auth failed'),
    } as unknown as ReturnType<typeof useAuth>);

    renderPage('?code=abc&state=xyz');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

    consoleErrorSpy.mockRestore();
  });
});
