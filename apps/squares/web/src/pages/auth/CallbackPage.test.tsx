import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    vi.mocked(useAuth).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);
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

  it('navigates to redirect path when authenticated', () => {
    sessionStorage.setItem('auth_redirect_path', '/contests');
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      error: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    renderPage('?code=abc&state=xyz');
    expect(mockNavigate).toHaveBeenCalledWith('/contests', { replace: true });
    sessionStorage.removeItem('auth_redirect_path');
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
