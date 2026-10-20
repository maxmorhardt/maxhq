import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeQuarterResult, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { Contest } from '../../../../types/contest';
import WinnersBoard from './WinnersBoard';

const api = vi.hoisted(() => ({ useRollbackQuarterResultMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const scored = makeContest({
  status: 'Q3',
  quarterResults: [
    makeQuarterResult({ id: 'q1', quarter: 1, winnerName: 'Ann' }),
    makeQuarterResult({ id: 'q2', quarter: 2, winner: 'ghost', winnerName: '' }),
  ],
});

const renderBoard = (contest: Contest = scored, isOwner = true) =>
  renderWithProviders(<WinnersBoard contest={contest} viewer={makeViewer({ isOwner })} />);

describe('WinnersBoard', () => {
  beforeEach(() => {
    api.useRollbackQuarterResultMutation.mockReturnValue(mockMutation(makeQuarterResult()));
  });

  it('says when nobody has won yet', () => {
    renderBoard(makeContest());
    expect(screen.getByText('No winners yet')).toBeInTheDocument();
  });

  it('lists each quarter’s winner', () => {
    renderBoard();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('ghost')).toBeInTheDocument();
  });

  it('shortens long names', () => {
    renderBoard(
      makeContest({
        quarterResults: [makeQuarterResult({ winnerName: 'A really long winner name' })],
      })
    );
    expect(screen.getByText('A really long win...')).toBeInTheDocument();
  });

  it('lets the owner of a manual contest roll back the latest quarter', async () => {
    const [rollback, state] = mockMutation(makeQuarterResult({ quarter: 2 }));
    api.useRollbackQuarterResultMutation.mockReturnValue([rollback, state]);
    const { store } = renderBoard();

    expect(screen.queryByRole('button', { name: 'Roll back Q1 result' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Roll back Q2 result' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Back' }));

    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Q2 result rolled back')
    );
    expect(rollback).toHaveBeenCalledWith('c-1');
  });

  it('shows why a rollback failed', () => {
    api.useRollbackQuarterResultMutation.mockReturnValue(
      mockMutation(undefined, { error: { status: 409, message: 'Too late' } })
    );
    renderBoard();
    fireEvent.click(screen.getByRole('button', { name: 'Roll back Q2 result' }));
    expect(screen.getByText('Too late')).toBeInTheDocument();
  });

  it('keeps rollbacks from linked contests and non-owners', () => {
    const { rerender } = renderBoard({ ...scored, gameId: 'g-1' });
    expect(screen.queryByRole('button', { name: /Roll back/ })).not.toBeInTheDocument();
    rerender(<WinnersBoard contest={scored} viewer={makeViewer({ isOwner: false })} />);
    expect(screen.queryByRole('button', { name: /Roll back/ })).not.toBeInTheDocument();
  });
});
