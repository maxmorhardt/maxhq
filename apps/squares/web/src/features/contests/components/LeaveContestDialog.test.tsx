import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../test/auth';
import { renderWithProviders } from '../../../test/render';
import LeaveContestDialog from './LeaveContestDialog';

const api = vi.hoisted(() => ({ useRemoveParticipantMutation: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const contest = { id: 'c-1', name: 'Test Bowl' };

describe('LeaveContestDialog', () => {
  it('renders nothing without a contest', () => {
    api.useRemoveParticipantMutation.mockReturnValue(mockMutation(undefined));
    renderWithProviders(<LeaveContestDialog contest={null} userId="u_me" onClose={vi.fn()} />);
    expect(screen.queryByText('Leave Contest')).not.toBeInTheDocument();
  });

  it('removes the signed-in user and closes', async () => {
    const [remove, state] = mockMutation(undefined);
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    const onClose = vi.fn();
    const onLeft = vi.fn();
    renderWithProviders(
      <LeaveContestDialog contest={contest} userId="u_me" onClose={onClose} onLeft={onLeft} />
    );

    expect(screen.getByText('Test Bowl')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(remove).toHaveBeenCalledWith({ contestId: 'c-1', userId: 'u_me' });
    expect(onLeft).toHaveBeenCalled();
  });

  it('does nothing until the user id is known', () => {
    const [remove, state] = mockMutation(undefined);
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    renderWithProviders(
      <LeaveContestDialog contest={contest} userId={undefined} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('shows why leaving failed', () => {
    api.useRemoveParticipantMutation.mockReturnValue(
      mockMutation(undefined, { error: { status: 409, message: 'Game already started' } })
    );
    renderWithProviders(<LeaveContestDialog contest={contest} userId="u_me" onClose={vi.fn()} />);
    expect(screen.getByText('Game already started')).toBeInTheDocument();
  });

  it('stays open when the request fails', async () => {
    const [remove, state] = mockMutation({ error: { status: 500, message: 'x' } });
    api.useRemoveParticipantMutation.mockReturnValue([remove, state]);
    const onClose = vi.fn();
    renderWithProviders(<LeaveContestDialog contest={contest} userId="u_me" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
