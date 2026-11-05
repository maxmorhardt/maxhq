import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router';
import JoinError from './JoinError';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderComponent(message: string) {
  return render(
    <ThemeProvider theme={createTheme()}>
      <MemoryRouter>
        <JoinError message={message} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('JoinError', () => {
  it('shows why the link failed', () => {
    renderComponent('the owner removed you from this contest');
    expect(screen.getByText('Unable to Join')).toBeInTheDocument();
    expect(screen.getByText('the owner removed you from this contest')).toBeInTheDocument();
  });

  it('explains that a reset link stops working', () => {
    renderComponent('gone');
    expect(screen.getByText(/stops working when the owner resets it/)).toBeInTheDocument();
  });

  it('navigates to /contests when My Contests is clicked', () => {
    renderComponent('gone');
    fireEvent.click(screen.getByRole('button', { name: /my contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
