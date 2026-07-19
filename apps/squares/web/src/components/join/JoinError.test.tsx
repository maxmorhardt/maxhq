import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import JoinError from './JoinError';
import type { InvitePreviewResponse } from '../../types/contest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme();

function renderComponent(props: React.ComponentProps<typeof JoinError>) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <JoinError {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

const preview = {
  contestId: 'abc',
  contestName: 'Super Bowl Contest',
  owner: 'alice',
  maxSquares: 2,
  role: 'participant',
} as InvitePreviewResponse;

describe('JoinError', () => {
  describe('error variant', () => {
    it('renders the Unable to Join heading', () => {
      renderComponent({ variant: 'error', message: 'Invite not found' });
      expect(screen.getByText('Unable to Join')).toBeInTheDocument();
    });

    it('renders the error message', () => {
      renderComponent({ variant: 'error', message: 'This invite has expired' });
      expect(screen.getByText('This invite has expired')).toBeInTheDocument();
    });

    it('falls back to a default message when none is given', () => {
      renderComponent({ variant: 'error' });
      expect(screen.getByText('This invite link is invalid or expired')).toBeInTheDocument();
    });
  });

  describe('no-squares variant', () => {
    it('renders the No Squares Available heading', () => {
      renderComponent({ variant: 'no-squares' });
      expect(screen.getByText('No Squares Available')).toBeInTheDocument();
    });

    it('names the contest in the description when preview is provided', () => {
      renderComponent({ variant: 'no-squares', preview });
      expect(screen.getByText('Super Bowl Contest')).toBeInTheDocument();
    });

    it('falls back to "this contest" in the description when preview is null', () => {
      renderComponent({ variant: 'no-squares', preview: null });
      expect(screen.queryByText('Super Bowl Contest')).not.toBeInTheDocument();
      expect(screen.getByText('this contest')).toBeInTheDocument();
    });

    it('names the owner in the hint when preview is provided', () => {
      renderComponent({ variant: 'no-squares', preview });
      expect(screen.getByText(/Ask alice to lower/)).toBeInTheDocument();
    });

    it('falls back to the contest owner in the hint when preview is null', () => {
      renderComponent({ variant: 'no-squares', preview: null });
      expect(screen.getByText(/Ask the contest owner to lower/)).toBeInTheDocument();
    });
  });

  it('navigates to /contests when My Contests is clicked', () => {
    renderComponent({ variant: 'error', message: 'Invite not found' });
    fireEvent.click(screen.getByRole('button', { name: /my contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
