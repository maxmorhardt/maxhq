import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeQuarterResult, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest, Square } from '../../../../types/contest';
import SquareDialog from './SquareDialog';

const api = vi.hoisted(() => ({ useClearSquareMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const mine = makeSquare({ value: 'ME', owner: 'player@x.com', ownerName: 'Me' });

function renderDialog(square: Square | null, contest: Contest = makeContest()) {
  const onClose = vi.fn();
  const result = renderWithProviders(
    <SquareDialog square={square} contest={contest} viewer={makeViewer()} onClose={onClose} />
  );
  return { ...result, onClose };
}

describe('SquareDialog', () => {
  let clear: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const [trigger, state] = mockMutation(makeSquare());
    clear = trigger;
    api.useClearSquareMutation.mockReturnValue([trigger, state]);
  });

  it('renders nothing without a square', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets the owner clear their square while the grid is open', async () => {
    const { onClose } = renderDialog(mine);
    expect(screen.getByText('Your Square')).toBeInTheDocument();
    expect(screen.getByText('Claimed by you')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Square' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(clear).toHaveBeenCalledWith({ contestId: 'c-1', squareId: 'sq-0-0' });
  });

  it('locks a full board so nothing can be cleared', () => {
    const full = makeContest({ squares: [mine, makeSquare({ id: 'sq-0-1', value: 'AB' })] });
    renderDialog(mine, full);
    expect(screen.getByText('Your Square')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Square' })).not.toBeInTheDocument();
  });

  it('shows who claimed someone else’s square', () => {
    renderDialog(makeSquare({ value: 'AB', owner: 'ann@x.com', ownerName: 'Ann' }));
    expect(screen.getByText('Square Details')).toBeInTheDocument();
    expect(screen.getByText('Claimed by Ann')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Square' })).not.toBeInTheDocument();
  });

  it('shortens the owner’s name and never falls back to their email', () => {
    const { unmount } = renderDialog(
      makeSquare({ value: 'AB', owner: 'ann@x.com', ownerName: 'Ann Lee' })
    );
    expect(screen.getByText('Claimed by Ann L.')).toBeInTheDocument();
    unmount();

    renderDialog(makeSquare({ value: 'AB', owner: 'ann@x.com', ownerName: '' }));
    expect(screen.getByText('Claimed by Player')).toBeInTheDocument();
    expect(screen.queryByText(/ann@x\.com/)).not.toBeInTheDocument();
  });

  it('names a departed player’s square ghost', () => {
    renderDialog(makeSquare({ value: 'AB', owner: 'ghost', ownerName: '' }));
    expect(screen.getByText('Claimed by ghost')).toBeInTheDocument();
  });

  it('lists the quarters a square won and locks it after kickoff', () => {
    renderDialog(
      mine,
      makeContest({
        status: 'Q3',
        quarterResults: [
          makeQuarterResult({ quarter: 2, winnerRow: 0, winnerCol: 0 }),
          makeQuarterResult({ id: 'q1', quarter: 1, winnerRow: 0, winnerCol: 0 }),
        ],
      })
    );
    expect(screen.getByText('Winner · Q1, Q2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Square' })).not.toBeInTheDocument();
  });

  it('reports a failed clear and stays open', async () => {
    api.useClearSquareMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'Nope' } })
    );
    const { onClose, store } = renderDialog(mine);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Square' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('Nope'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    const { onClose } = renderDialog(mine);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalled();
  });
});
