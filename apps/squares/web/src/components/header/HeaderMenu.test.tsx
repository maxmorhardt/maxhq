import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import HeaderMenu from './HeaderMenu';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));

import { useAuth } from 'react-oidc-context';

const theme = createTheme();

const mockPages = [
  { name: 'Contests', icon: <span />, navigate: '/contests' },
  { name: 'Learn More', icon: <span />, navigate: '/learn-more' },
  { name: 'Contact', icon: <span />, navigate: '/contact' },
];

function renderMenu(overrides?: { anchorElNav?: HTMLElement | null }) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <HeaderMenu
          handleOpenNavMenu={vi.fn()}
          handleCloseNavMenu={vi.fn()}
          isAuthButtonDisabled={false}
          anchorElNav={overrides?.anchorElNav ?? null}
          pages={mockPages}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('HeaderMenu', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockNavigate.mockClear();
  });

  it('renders the hamburger menu button', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('shows Google and GitHub sign-in items when menu is open and user is unauthenticated', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();
    document.body.removeChild(anchorEl);
  });

  it('hides Contests menu item when unauthenticated', () => {
    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    expect(screen.queryByText('Contests')).not.toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
    document.body.removeChild(anchorEl);
  });

  it('shows Contests menu item when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    expect(screen.getByText('Contests')).toBeInTheDocument();
    document.body.removeChild(anchorEl);
  });

  it('navigates when a menu item is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      activeNavigator: undefined,
      signinRedirect: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    fireEvent.click(screen.getByText('Learn More'));
    expect(mockNavigate).toHaveBeenCalledWith('/learn-more');
    document.body.removeChild(anchorEl);
  });

  it('redirects with the google connector when Google sign-in is clicked', () => {
    const mockSigninRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);

    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    fireEvent.click(screen.getByText('Sign in with Google'));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
    document.body.removeChild(anchorEl);
  });

  it('redirects with the github connector when GitHub sign-in is clicked', () => {
    const mockSigninRedirect = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);

    const anchorEl = document.createElement('button');
    document.body.appendChild(anchorEl);
    renderMenu({ anchorElNav: anchorEl });

    fireEvent.click(screen.getByText('Sign in with GitHub'));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
    document.body.removeChild(anchorEl);
  });
});
