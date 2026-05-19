import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import HeaderAuth from './HeaderAuth';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const mockSettings = [
  { name: 'Account', icon: <span>AccountIcon</span> },
  { name: 'Logout', icon: <span>LogoutIcon</span> },
];

function renderAuth(overrides?: {
  handleOpenUserMenu?: () => void;
  handleSettingClick?: (s: string) => void;
  anchorElUser?: HTMLElement | null;
}) {
  return render(
    <ThemeProvider theme={theme}>
      <HeaderAuth
        handleOpenUserMenu={overrides?.handleOpenUserMenu ?? vi.fn()}
        handleCloseUserMenu={vi.fn()}
        handleRegister={vi.fn()}
        handleSettingClick={overrides?.handleSettingClick ?? vi.fn()}
        isAuthButtonDisabled={false}
        anchorElUser={overrides?.anchorElUser ?? null}
        settings={mockSettings}
      />
    </ThemeProvider>
  );
}

describe('HeaderAuth', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
      signinRedirect: vi.fn(),
      signoutSilent: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('shows Login and Register buttons when not authenticated', () => {
    renderAuth();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('calls signinRedirect when Login is clicked', () => {
    const mockSignin = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      user: null,
      signinRedirect: mockSignin,
    } as unknown as ReturnType<typeof useAuth>);

    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(mockSignin).toHaveBeenCalled();
  });

  it('calls handleRegister when Register is clicked', () => {
    const handleRegister = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <HeaderAuth
          handleOpenUserMenu={vi.fn()}
          handleCloseUserMenu={vi.fn()}
          handleRegister={handleRegister}
          handleSettingClick={vi.fn()}
          isAuthButtonDisabled={false}
          anchorElUser={null}
          settings={mockSettings}
        />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    expect(handleRegister).toHaveBeenCalled();
  });

  it('shows user avatar when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      user: { profile: { name: 'Alice' } },
      signinRedirect: vi.fn(),
      signoutSilent: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderAuth();
    expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
  });
});
