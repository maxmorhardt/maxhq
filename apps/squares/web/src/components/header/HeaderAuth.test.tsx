import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import HeaderAuth from './HeaderAuth';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const mockSettings = [{ name: 'Logout', icon: <span>LogoutIcon</span> }];

function renderAuth(overrides?: {
  handleOpenUserMenu?: () => void;
  handleSettingClick?: (s: string) => void;
  anchorElUser?: HTMLElement | null;
}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <HeaderAuth
          handleOpenUserMenu={overrides?.handleOpenUserMenu ?? vi.fn()}
          handleCloseUserMenu={vi.fn()}
          handleSettingClick={overrides?.handleSettingClick ?? vi.fn()}
          isAuthButtonDisabled={false}
          anchorElUser={overrides?.anchorElUser ?? null}
          settings={mockSettings}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function mockAuth(signinRedirect = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    activeNavigator: undefined,
    user: null,
    signinRedirect,
  } as unknown as ReturnType<typeof useAuth>);
  return signinRedirect;
}

describe('HeaderAuth', () => {
  beforeEach(() => {
    mockAuth();
  });

  it('shows a Sign In button when not authenticated', () => {
    renderAuth();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('opens the provider dropdown when Sign In is clicked', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('menuitem', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /github/i })).toBeInTheDocument();
  });

  it('redirects with the google connector when Google is selected', () => {
    const mockSignin = mockAuth();

    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /google/i }));
    expect(mockSignin).toHaveBeenCalledWith({ extraQueryParams: { connector_id: 'google' } });
  });

  it('redirects with the github connector when GitHub is selected', () => {
    const mockSignin = mockAuth();

    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /github/i }));
    expect(mockSignin).toHaveBeenCalledWith({ extraQueryParams: { connector_id: 'github' } });
  });

  it('shows user avatar when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { name: 'Alice' } },
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderAuth();
    expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });
});
