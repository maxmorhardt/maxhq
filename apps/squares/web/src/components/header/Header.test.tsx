import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

const mockNavigate = vi.fn();
const mockRemoveUser = vi.fn();
const mockSigninRedirect = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

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

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      removeUser: mockRemoveUser,
      signinRedirect: mockSigninRedirect,
      user: null,
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('renders the brand name', () => {
    renderHeader();
    const brands = screen.getAllByText('Squares');
    expect(brands.length).toBeGreaterThan(0);
  });

  it('renders the Sign In button when unauthenticated', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows provider options when Sign In is clicked', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('menuitem', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /github/i })).toBeInTheDocument();
  });

  it('does not show Contests desktop link when unauthenticated', () => {
    renderHeader();
    expect(screen.queryByRole('button', { name: /contests/i })).not.toBeInTheDocument();
  });

  it('shows Contests desktop link when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    expect(screen.getByRole('button', { name: /contests/i })).toBeInTheDocument();
  });

  it('navigates home when the brand name is clicked', () => {
    renderHeader();
    // there are multiple "Squares" text elements; click the first desktop one
    fireEvent.click(screen.getAllByText('Squares')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to /learn-more when the desktop Learn More button is clicked', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /learn more/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
  });

  it('navigates to /contact when the desktop Contact button is clicked', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /contact/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contact');
  });

  it('navigates to /contests when the desktop Contests button is clicked (authenticated)', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /^contests$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });

  it('disables the sign-in button while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: undefined,
      removeUser: mockRemoveUser,
      signinRedirect: mockSigninRedirect,
      user: null,
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('opens the user menu when the avatar button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      removeUser: mockRemoveUser,
      signinRedirect: mockSigninRedirect,
      user: { profile: { name: 'Alice' } },
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls auth.removeUser when Logout is clicked', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      removeUser: mockRemoveUser,
      signinRedirect: mockSigninRedirect,
      user: { profile: { name: 'Alice' } },
      settings: { client_id: 'squares', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /account/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    await waitFor(() => expect(mockRemoveUser).toHaveBeenCalled());
  });

  it('opens the hamburger menu and navigates via a menu item', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    const learnMoreItem = screen.getAllByText('Learn More')[0];
    fireEvent.click(learnMoreItem);
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
  });
});
