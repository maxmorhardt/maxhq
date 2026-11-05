import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeParticipant } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Participant } from '../../../../types/contest';
import EditParticipantDialog from './EditParticipantDialog';

const api = vi.hoisted(() => ({ useUpdateParticipantMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

function renderDialog(
  participant: Participant | null,
  { claimed = 0, maxAllowed = 20 }: { claimed?: number; maxAllowed?: number } = {}
) {
  const onClose = vi.fn();
  return {
    onClose,
    ...renderWithProviders(
      <EditParticipantDialog
        contestId="c-1"
        participant={participant}
        claimed={claimed}
        maxAllowed={maxAllowed}
        onClose={onClose}
      />
    ),
  };
}

const setLimit = (value: number) =>
  fireEvent.change(screen.getByRole('slider', { name: 'Max squares' }), { target: { value } });

describe('EditParticipantDialog', () => {
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const [trigger, state] = mockMutation(makeParticipant());
    update = trigger;
    api.useUpdateParticipantMutation.mockReturnValue([trigger, state]);
  });

  it('renders nothing without a participant', () => {
    renderDialog(null);
    expect(screen.queryByText('Edit Squares')).not.toBeInTheDocument();
  });

  it('saves a new square limit', async () => {
    const { onClose, store } = renderDialog(makeParticipant({ maxSquares: 5 }));
    setLimit(8);
    expect(screen.getByText('12 squares left to give out')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      contestId: 'c-1',
      userId: 'u_participant',
      maxSquares: 8,
    });
    expect(store.getState().toast.messages[0]?.message).toBe('Participant updated');
  });

  it('caps the slider at what is left to give out', () => {
    renderDialog(makeParticipant({ maxSquares: 5 }), { maxAllowed: 6 });
    expect(screen.getByRole('slider', { name: 'Max squares' })).toHaveAttribute('max', '6');
    setLimit(6);
    expect(screen.getByText('0 squares left to give out')).toBeInTheDocument();
  });

  it('can take every square away', async () => {
    renderDialog(makeParticipant({ maxSquares: 5 }));
    setLimit(0);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ maxSquares: 0 }))
    );
  });

  it('warns that lowering below what they hold frees squares at random', async () => {
    renderDialog(makeParticipant({ maxSquares: 10 }), { claimed: 8 });
    setLimit(5);

    expect(screen.getByText(/3 of their squares will be freed at random/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Free 3' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ maxSquares: 5 }))
    );
  });

  it('names a single freed square', () => {
    renderDialog(makeParticipant({ maxSquares: 10 }), { claimed: 6, maxAllowed: 20 });
    setLimit(5);
    expect(screen.getByText(/1 of their squares will be freed/)).toBeInTheDocument();
  });

  it('needs a change before it saves', () => {
    renderDialog(makeParticipant({ maxSquares: 5 }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows why a save failed and offers a retry', async () => {
    const error = { status: 400, message: "that would give out more than the board's 100 squares" };
    api.useUpdateParticipantMutation.mockReturnValue(
      mockMutation({ error }, { isError: true, error })
    );
    const { onClose } = renderDialog(makeParticipant());
    expect(screen.getByRole('alert')).toHaveTextContent('more than the board');
    setLimit(2);
    fireEvent.click(screen.getByRole('button', { name: 'Failed, Retry' }));
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });

  it('falls back to a generic message when the error has none', () => {
    api.useUpdateParticipantMutation.mockReturnValue(
      mockMutation({ error: 'boom' }, { isError: true, error: 'boom' })
    );
    renderDialog(makeParticipant());
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update participant');
  });
});
