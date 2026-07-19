import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ContestError from './ContestError';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme();

function renderComponent() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ContestError />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ContestError', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the error heading', () => {
    renderComponent();
    expect(screen.getByText('Failed to get your contest')).toBeInTheDocument();
  });

  it('calls window.location.reload when Try Again is clicked', () => {
    const mockReload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload: mockReload });
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReload).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not offer a Go Home action', () => {
    renderComponent();
    expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument();
  });

  it('navigates to "/contests" when Browse Contests is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /browse contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
