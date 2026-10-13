import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LeaveContest from './LeaveContest';

const mockUnwrap = vi.fn().mockResolvedValue('u');
const mockDispatch = vi.fn(() => ({ unwrap: mockUnwrap }));

vi.mock('../../hooks/reduxHooks', () => ({ useAppDispatch: () => mockDispatch }));
vi.mock('../../features/contests/contestThunks', () => ({
  removeContestParticipant: vi.fn((arg) => ({ type: 'removeParticipant', arg })),
}));

import { removeContestParticipant } from '../../features/contests/contestThunks';

const theme = createTheme();

function renderDialog(overrides?: { onClose?: () => void; onLeft?: () => void }) {
  return render(
    <ThemeProvider theme={theme}>
      <LeaveContest
        open
        onClose={overrides?.onClose ?? vi.fn()}
        contest={{ id: 'c1', name: 'pool' }}
        userEmail="a@b.com"
        onLeft={overrides?.onLeft}
      />
    </ThemeProvider>
  );
}

describe('LeaveContest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnwrap.mockResolvedValue('u');
  });

  it('renders the contest name', () => {
    renderDialog();
    expect(screen.getByText('pool')).toBeInTheDocument();
  });

  it('renders nothing when no contest is given', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <LeaveContest open onClose={vi.fn()} contest={null} userEmail="a@b.com" />
      </ThemeProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('dispatches removal and fires callbacks on confirm', async () => {
    const onClose = vi.fn();
    const onLeft = vi.fn();
    renderDialog({ onClose, onLeft });

    fireEvent.click(screen.getByRole('button', { name: /^leave$/i }));

    await waitFor(() =>
      expect(removeContestParticipant).toHaveBeenCalledWith({ contestId: 'c1', userId: 'a@b.com' })
    );
    await waitFor(() => expect(onLeft).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows an in-dialog error when leaving fails and stays open', async () => {
    mockUnwrap.mockRejectedValue({ message: 'Contest already started' });
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole('button', { name: /^leave$/i }));

    expect(await screen.findByText('Contest already started')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
