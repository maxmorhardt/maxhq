import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import LandingCreateContestButton from './LandingCreateContestButton';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSigninRedirect = vi.fn();
vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderButton() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <LandingCreateContestButton />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LandingCreateContestButton', () => {
  it('renders the button with text "Create a Contest"', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
    renderButton();
    expect(screen.getByRole('button', { name: /create a contest/i })).toBeInTheDocument();
  });

  it('navigates to /contests/create when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /create a contest/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests/create');
  });

  it('opens the sign-in dialog when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /create a contest/i }));
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('redirects with the chosen connector from the dialog', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      signinRedirect: mockSigninRedirect,
    } as unknown as ReturnType<typeof useAuth>);
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: /create a contest/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in with github/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });
});
