import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { renderWithProviders } from '../../../../test/render';
import type { ContestSummary } from '../../../../types/contest';
import DeleteContestDialog from './DeleteContestDialog';

const api = vi.hoisted(() => ({ useDeleteContestMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const contest = { id: 'c-1', name: 'Office Pool' } as ContestSummary;

describe('DeleteContestDialog', () => {
  it('renders nothing without a contest', () => {
    api.useDeleteContestMutation.mockReturnValue(mockMutation(undefined));
    renderWithProviders(<DeleteContestDialog contest={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes the contest after confirming', async () => {
    const [remove, state] = mockMutation(undefined);
    api.useDeleteContestMutation.mockReturnValue([remove, state]);
    const onClose = vi.fn();
    renderWithProviders(<DeleteContestDialog contest={contest} onClose={onClose} />);

    expect(screen.getByText('Office Pool')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(remove).toHaveBeenCalledWith('c-1');
    expect(state.reset).toHaveBeenCalled();
  });

  it('stays open and explains a failure', async () => {
    const [remove, state] = mockMutation(
      { error: { status: 409, message: 'x' } },
      { error: { status: 409, message: 'Contest already started' } }
    );
    api.useDeleteContestMutation.mockReturnValue([remove, state]);
    const onClose = vi.fn();
    renderWithProviders(<DeleteContestDialog contest={contest} onClose={onClose} />);

    expect(screen.getByText('Contest already started')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables both actions while deleting', () => {
    api.useDeleteContestMutation.mockReturnValue(mockMutation(undefined, { isLoading: true }));
    renderWithProviders(<DeleteContestDialog contest={contest} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
