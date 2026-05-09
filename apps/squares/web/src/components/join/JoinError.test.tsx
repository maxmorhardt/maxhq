import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import JoinError from './JoinError';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme();

function renderComponent(message = 'Something went wrong') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <JoinError message={message} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('JoinError', () => {
  it('renders the Unable to Join heading', () => {
    renderComponent();
    expect(screen.getByText('Unable to Join')).toBeInTheDocument();
  });

  it('renders the error message', () => {
    renderComponent('This invite has expired');
    expect(screen.getByText('This invite has expired')).toBeInTheDocument();
  });

  it('navigates to /contests when My Contests is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /my contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
