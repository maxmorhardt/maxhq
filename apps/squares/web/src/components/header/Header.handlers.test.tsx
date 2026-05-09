/**
 * Tests for Header.tsx handler functions, rendered WITHOUT mocking HeaderAuth/HeaderMenu
 * so that the real child components call the handlers passed from Header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

const mockNavigate = vi.fn();
const mockSignoutSilent = vi.fn();
const mockSigninRedirect = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/oidcHelpers', () => ({
  createOidcStateForRegistration: vi.fn().mockResolvedValue({ state: 's', codeChallenge: 'c' }),
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

function renderHeader() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Header handlers (real children)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      signoutSilent: mockSignoutSilent,
      signinRedirect: mockSigninRedirect,
      user: { profile: { name: 'Alice' } },
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('opens the user menu when the avatar button is clicked', () => {
    renderHeader();
    const avatarBtn = screen.getByRole('button', { name: /open settings/i });
    fireEvent.click(avatarBtn);
    // The menu items become visible
    expect(screen.getByRole('menuitem', { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls auth.signoutSilent when Logout setting is clicked', async () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    await waitFor(() => expect(mockSignoutSilent).toHaveBeenCalled());
  });

  it('opens Account settings in a new tab when Account setting is clicked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^account$/i }));
    expect(openSpy).toHaveBeenCalledWith('https://login.maxstash.io/if/user/#/settings', '_blank');
    openSpy.mockRestore();
  });

  it('opens hamburger menu and navigates via a menu item', () => {
    renderHeader();
    const hamburger = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(hamburger);
    // Learn More is always visible (no auth restriction)
    const learnMoreItem = screen.getAllByText('Learn More')[0];
    fireEvent.click(learnMoreItem);
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
  });
});
