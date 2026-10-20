import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import StartGameButton from './StartGameButton';

const api = vi.hoisted(() => ({ useStartContestMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

describe('StartGameButton', () => {
  it('starts the contest and says so', async () => {
    const [start, state] = mockMutation(makeContest({ status: 'Q1' }));
    api.useStartContestMutation.mockReturnValue([start, state]);
    const { store } = renderWithProviders(<StartGameButton contestId="c-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Quarter 1' }));

    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Quarter 1 started!')
    );
    expect(start).toHaveBeenCalledWith('c-1');
  });

  it('reports a failure', async () => {
    api.useStartContestMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'Grid not full' } })
    );
    const { store } = renderWithProviders(<StartGameButton contestId="c-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Quarter 1' }));
    await waitFor(() => expect(store.getState().toast.messages[0]?.message).toBe('Grid not full'));
  });

  it('shows progress while starting', () => {
    api.useStartContestMutation.mockReturnValue(mockMutation(undefined, { isLoading: true }));
    renderWithProviders(<StartGameButton contestId="c-1" />);
    expect(screen.getByRole('button', { name: 'Starting...' })).toBeDisabled();
  });
});
