import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from 'react-oidc-context';

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('NotFoundPage', () => {
  it('renders the 404 heading', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the "Page Not Found" subtitle', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders the Go Home button', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('navigates home when Go Home is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /go home/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows Browse Contests button when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    expect(screen.getByRole('button', { name: /browse contests/i })).toBeInTheDocument();
  });

  it('hides Browse Contests button when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderPage();
    expect(screen.queryByRole('button', { name: /browse contests/i })).not.toBeInTheDocument();
  });
});
