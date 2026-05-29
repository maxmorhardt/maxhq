import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toastReducer } from './features/toast/toastSlice';
import App from './App';

const mockShowToast = vi.fn();
const mockSigninSilent = vi.fn().mockResolvedValue(null);

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('./hooks/useAxiosAuth', () => ({ useAxiosAuth: vi.fn() }));
vi.mock('./hooks/useToast', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
vi.mock('./components/common/ScrollToTop', () => ({ default: () => null }));
vi.mock('./components/toast/ToastProvider', () => ({ ToastProvider: () => null }));
vi.mock('./components/common/AuthLoadingAnimation', () => ({ default: () => null }));
vi.mock('./components/header/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('./components/footer/Footer', () => ({ default: () => <div data-testid="footer" /> }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, Outlet: () => <div data-testid="outlet" /> };
});

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

function createStore() {
  return configureStore({ reducer: { toast: toastReducer } });
}

function renderApp(store = createStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </Provider>
  );
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);
    mockSigninSilent.mockClear();
    mockShowToast.mockClear();
  });

  it('renders the header', () => {
    renderApp();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders the footer', () => {
    renderApp();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders the outlet', () => {
    renderApp();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('calls signinSilent when not authenticated but has refresh token', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: { refresh_token: 'refresh123' },
      activeNavigator: undefined,
      signinSilent: mockSigninSilent,
    } as unknown as ReturnType<typeof useAuth>);

    renderApp();
    await waitFor(() => expect(mockSigninSilent).toHaveBeenCalled());
  });

  it('shows auth error toast when signinRedirect previously failed', async () => {
    // first render with activeNavigator set to signinRedirect
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
      activeNavigator: 'signinRedirect',
    } as unknown as ReturnType<typeof useAuth>);

    const store = createStore();
    const { rerender } = renderApp(store);

    // now simulate auth error after redirect completes
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: new Error('access_denied'),
      user: null,
      activeNavigator: undefined,
    } as unknown as ReturnType<typeof useAuth>);

    rerender(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </Provider>
    );

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Authentication failed. Please try again', 'error')
    );
  });

  it('handles signinSilent rejection gracefully', async () => {
    const mockSigninSilentReject = vi.fn().mockRejectedValue(new Error('network error'));
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: { refresh_token: 'refresh123' },
      activeNavigator: undefined,
      signinSilent: mockSigninSilentReject,
    } as unknown as ReturnType<typeof useAuth>);

    renderApp();
    await waitFor(() => expect(mockSigninSilentReject).toHaveBeenCalled());
    // should not throw — component still renders
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
