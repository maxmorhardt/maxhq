import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makePlayer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Player } from '../../../../types/contest';
import EditPlayerDialog from './EditPlayerDialog';

const api = vi.hoisted(() => ({ useUpdatePlayerMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

function renderDialog(
  player: Player | null,
  { claimed = 0, maxAllowed = 20 }: { claimed?: number; maxAllowed?: number } = {}
) {
  const onClose = vi.fn();
  return {
    onClose,
    ...renderWithProviders(
      <EditPlayerDialog
        contestId="c-1"
        player={player}
        claimed={claimed}
        maxAllowed={maxAllowed}
        onClose={onClose}
      />
    ),
  };
}

const setLimit = (value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: 'Max squares' }), { target: { value } });

describe('EditPlayerDialog', () => {
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const [trigger, state] = mockMutation(makePlayer());
    update = trigger;
    api.useUpdatePlayerMutation.mockReturnValue([trigger, state]);
  });

  it('renders nothing without a player', () => {
    renderDialog(null);
    expect(screen.queryByText('Edit Squares')).not.toBeInTheDocument();
  });

  it('saves a new square limit', async () => {
    const { onClose, store } = renderDialog(makePlayer({ maxSquares: 5 }));
    setLimit(8);
    expect(screen.getByText('12 squares left to give out')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      contestId: 'c-1',
      userId: 'u_player',
      maxSquares: 8,
    });
    expect(store.getState().toast.messages[0]?.message).toBe('Pat P. now has 8 squares');
  });

  it('caps the slider at what is left to give out', () => {
    renderDialog(makePlayer({ maxSquares: 5 }), { maxAllowed: 6 });
    expect(screen.getByRole('slider', { name: 'Max squares' })).toHaveAttribute('max', '6');
    setLimit(6);
    expect(screen.getByText('0 squares left to give out')).toBeInTheDocument();
  });

  it('can take every square away', async () => {
    renderDialog(makePlayer({ maxSquares: 5 }));
    setLimit(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ maxSquares: 0 }))
    );
  });

  it('warns that lowering below what they hold frees squares at random', async () => {
    const { store } = renderDialog(makePlayer({ maxSquares: 10 }), { claimed: 8 });
    setLimit(5);

    expect(screen.getByText(/3 of their squares will be freed at random/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Free 3' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ maxSquares: 5 }))
    );
    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Pat P. now has 5 squares, 3 freed')
    );
  });

  it('names a single freed square', () => {
    renderDialog(makePlayer({ maxSquares: 10 }), { claimed: 6, maxAllowed: 20 });
    setLimit(5);
    expect(screen.getByText(/1 of their squares will be freed/)).toBeInTheDocument();
  });

  it('needs a change before it saves', () => {
    renderDialog(makePlayer({ maxSquares: 5 }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows why a save failed and offers a retry', async () => {
    const error = { status: 400, message: "that would give out more than the board's 100 squares" };
    api.useUpdatePlayerMutation.mockReturnValue(mockMutation({ error }, { isError: true, error }));
    const { onClose } = renderDialog(makePlayer());
    expect(screen.getByRole('alert')).toHaveTextContent('more than the board');
    setLimit(2);
    fireEvent.click(screen.getByRole('button', { name: 'Failed, Retry' }));
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });

  it('falls back to a generic message when the error has none', () => {
    api.useUpdatePlayerMutation.mockReturnValue(
      mockMutation({ error: 'boom' }, { isError: true, error: 'boom' })
    );
    renderDialog(makePlayer());
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update player');
  });
});
