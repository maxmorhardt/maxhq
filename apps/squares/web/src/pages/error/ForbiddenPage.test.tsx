import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ForbiddenPage from './ForbiddenPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme({ palette: { mode: 'dark' } });

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ForbiddenPage', () => {
  it('renders the 403 heading', () => {
    renderPage();
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('renders the "Access Denied" subtitle', () => {
    renderPage();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
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

  it('renders the My Contests button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /my contests/i })).toBeInTheDocument();
  });

  it('navigates to /contests when My Contests is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /my contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
