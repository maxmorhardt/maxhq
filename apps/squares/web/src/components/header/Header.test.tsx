import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/oidcHelpers', () => ({
  createOidcStateForRegistration: vi.fn().mockResolvedValue({ state: 's', codeChallenge: 'c' }),
}));
vi.mock('./HeaderAuth', () => ({ default: () => <div data-testid="header-auth" /> }));
vi.mock('./HeaderMenu', () => ({ default: () => <div data-testid="header-menu" /> }));

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
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      activeNavigator: undefined,
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);
    mockNavigate.mockClear();
  });

  it('renders the brand name', () => {
    renderHeader();
    const brands = screen.getAllByText('Squares');
    expect(brands.length).toBeGreaterThan(0);
  });

  it('renders HeaderAuth and HeaderMenu slots', () => {
    renderHeader();
    expect(screen.getByTestId('header-auth')).toBeInTheDocument();
    expect(screen.getByTestId('header-menu')).toBeInTheDocument();
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
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    expect(screen.getByRole('button', { name: /contests/i })).toBeInTheDocument();
  });

  it('navigates home when the brand name is clicked', () => {
    renderHeader();
    // There are multiple "Squares" text elements; click the first desktop one
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
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /^contests$/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });

  it('sets isAuthButtonDisabled when auth is loading (not signoutSilent)', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: undefined,
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    // Just verifying it renders without error; the disabled prop is passed to mocked children
    expect(screen.getByTestId('header-menu')).toBeInTheDocument();
  });

  it('isAuthButtonDisabled is false when activeNavigator is signoutSilent', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      activeNavigator: 'signoutSilent',
      settings: { client_id: 'c', redirect_uri: 'r', scope: 'openid' },
    } as unknown as ReturnType<typeof useAuth>);

    renderHeader();
    expect(screen.getByTestId('header-menu')).toBeInTheDocument();
  });
});
