import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import UnauthorizedPage from './UnauthorizedPage';

const mockNavigate = vi.fn();
const mockSigninRedirect = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    signinRedirect: mockSigninRedirect,
  } as unknown as ReturnType<typeof useAuth>);

  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <UnauthorizedPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('UnauthorizedPage', () => {
  it('renders the 401 heading', () => {
    renderPage();
    expect(screen.getByText('401')).toBeInTheDocument();
  });

  it('renders the "Sign In Required" subtitle', () => {
    renderPage();
    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
  });

  it('renders the Sign In button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('opens the sign-in dialog when Sign In is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
  });

  it('redirects with the chosen connector from the dialog', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));
    expect(mockSigninRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
  });

  it('renders the Go Home button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('navigates home when Go Home is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
