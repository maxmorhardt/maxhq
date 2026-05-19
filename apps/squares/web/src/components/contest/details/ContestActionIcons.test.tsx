import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ContestActionIcons from './ContestActionIcons';

vi.mock('./InviteManager', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="invite-manager">
        <button onClick={onClose}>Close Invites</button>
      </div>
    ) : null,
}));
vi.mock('./ParticipantsManager', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="participants-manager">
        <button onClick={onClose}>Close Participants</button>
      </div>
    ) : null,
}));

const theme = createTheme();

function renderIcons(isOwner = false) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ContestActionIcons isOwner={isOwner} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ContestActionIcons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Participants and How-to-play icon buttons', () => {
    renderIcons(false);
    expect(screen.getByRole('button', { name: /participants/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /how to play/i })).toBeInTheDocument();
  });

  it('shows the Invite Links button for owners', () => {
    renderIcons(true);
    expect(screen.getByRole('button', { name: /invite links/i })).toBeInTheDocument();
  });

  it('hides the Invite Links button for non-owners', () => {
    renderIcons(false);
    expect(screen.queryByRole('button', { name: /invite links/i })).not.toBeInTheDocument();
  });

  it('opens InviteManager when Invite Links is clicked', () => {
    renderIcons(true);
    fireEvent.click(screen.getByRole('button', { name: /invite links/i }));
    expect(screen.getByTestId('invite-manager')).toBeInTheDocument();
  });

  it('opens ParticipantsManager when Participants is clicked', () => {
    renderIcons(false);
    fireEvent.click(screen.getByRole('button', { name: /participants/i }));
    expect(screen.getByTestId('participants-manager')).toBeInTheDocument();
  });
});
