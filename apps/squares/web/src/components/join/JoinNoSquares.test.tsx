import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import JoinNoSquares from './JoinNoSquares';
import type { InvitePreviewResponse } from '../../types/contest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const theme = createTheme();

function renderComponent(preview: InvitePreviewResponse | null = null) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <JoinNoSquares preview={preview} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('JoinNoSquares', () => {
  it('renders the No Squares Available heading', () => {
    renderComponent();
    expect(screen.getByText('No Squares Available')).toBeInTheDocument();
  });

  it('shows the contest name chip when preview is provided', () => {
    const preview = {
      contestName: 'Super Bowl Contest',
      owner: 'alice',
      maxSquares: 2,
    } as InvitePreviewResponse;
    renderComponent(preview);
    expect(screen.getByText('Super Bowl Contest')).toBeInTheDocument();
  });

  it('does not show the chip when preview is null', () => {
    renderComponent(null);
    // the chip only renders the contest name when preview is provided
    expect(screen.queryByText('Super Bowl Contest')).not.toBeInTheDocument();
  });

  it('navigates to /contests when My Contests is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /my contests/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/contests');
  });
});
