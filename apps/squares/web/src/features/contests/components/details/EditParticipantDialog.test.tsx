import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeParticipant } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Participant } from '../../../../types/contest';
import EditParticipantDialog from './EditParticipantDialog';

const api = vi.hoisted(() => ({ useUpdateParticipantMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

function renderDialog(participant: Participant | null, onClose = vi.fn()) {
  return {
    onClose,
    ...renderWithProviders(
      <EditParticipantDialog contestId="c-1" participant={participant} onClose={onClose} />
    ),
  };
}

function chooseRole(name: string) {
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(name));
}

describe('EditParticipantDialog', () => {
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const [trigger, state] = mockMutation(makeParticipant());
    update = trigger;
    api.useUpdateParticipantMutation.mockReturnValue([trigger, state]);
  });

  it('renders nothing without a participant', () => {
    renderDialog(null);
    expect(screen.queryByText('Edit Participant')).not.toBeInTheDocument();
  });

  it('saves a participant’s role and limit', async () => {
    const { onClose, store } = renderDialog(makeParticipant({ maxSquares: 5 }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      contestId: 'c-1',
      userId: 'player@x.com',
      request: { role: 'participant', maxSquares: 5 },
    });
    expect(store.getState().toast.messages[0]?.message).toBe('Participant updated');
  });

  it('gives a viewer no squares', async () => {
    renderDialog(makeParticipant());
    chooseRole('Viewer');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ request: { role: 'viewer', maxSquares: 0 } })
      )
    );
  });

  it('gives a promoted viewer at least one square', async () => {
    renderDialog(makeParticipant({ role: 'viewer', maxSquares: 0 }));
    chooseRole('Participant');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ request: { role: 'participant', maxSquares: 1 } })
      )
    );
  });

  it('only changes the owner’s limit', async () => {
    renderDialog(makeParticipant({ role: 'owner', maxSquares: 3 }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ request: { maxSquares: 3 } }))
    );
  });

  it('offers a retry after a failed save', async () => {
    api.useUpdateParticipantMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'x' } }, { isError: true })
    );
    const { onClose } = renderDialog(makeParticipant());
    fireEvent.click(screen.getByRole('button', { name: 'Failed, Retry' }));
    await waitFor(() => expect(onClose).not.toHaveBeenCalled());
  });
});
