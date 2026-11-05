import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../../test/auth';
import { makeContest, makeSquare, makeViewer } from '../../../../test/fixtures';
import { renderWithProviders } from '../../../../test/render';
import type { ContestViewer } from '../../live/viewer';
import SquareActions from './SquareActions';

const api = vi.hoisted(() => ({
  useClaimRandomSquaresMutation: vi.fn(),
  useClearMySquaresMutation: vi.fn(),
}));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

function renderActions(viewer: ContestViewer = makeViewer(), emptySquares = 9) {
  const result = renderWithProviders(
    <SquareActions contest={makeContest()} viewer={viewer} emptySquares={emptySquares} />
  );
  return { ...result, toasts: () => result.store.getState().toast.messages };
}

describe('SquareActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.useClaimRandomSquaresMutation.mockReturnValue(
      mockMutation({ squares: [makeSquare()], requested: 1 })
    );
    api.useClearMySquaresMutation.mockReturnValue(mockMutation([]));
  });

  it('starts a participant at every square they have left', async () => {
    const [claim, state] = mockMutation({ squares: [makeSquare()], requested: 5 });
    api.useClaimRandomSquaresMutation.mockReturnValue([claim, state]);
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'Randomly Select 5' }));

    await waitFor(() => expect(claim).toHaveBeenCalledWith({ contestId: 'c-1', count: 5 }));
  });

  it('starts the owner at one square, since they often hold some back', () => {
    renderActions(makeViewer({ isOwner: true, squaresLeft: 25 }));
    expect(screen.getByRole('button', { name: 'Randomly Select Square' })).toBeInTheDocument();
  });

  it('claims the chosen number of random squares', async () => {
    const [claim, state] = mockMutation({ squares: [makeSquare(), makeSquare()], requested: 4 });
    api.useClaimRandomSquaresMutation.mockReturnValue([claim, state]);
    renderActions();

    fireEvent.click(screen.getByRole('button', { name: 'decrease square count' }));
    fireEvent.click(screen.getByRole('button', { name: 'Randomly Select 4' }));

    await waitFor(() => expect(claim).toHaveBeenCalledWith({ contestId: 'c-1', count: 4 }));
  });

  it('never starts above the open squares', () => {
    renderActions(makeViewer({ squaresLeft: 5 }), 3);
    expect(screen.getByRole('button', { name: 'Randomly Select 3' })).toBeInTheDocument();
  });

  it('caps the count at what is left and steps back down', () => {
    renderActions(makeViewer({ squaresLeft: 3 }));
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByRole('button', { name: 'Randomly Select 3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'decrease square count' }));
    expect(screen.getByRole('button', { name: 'Randomly Select 2' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
    expect(screen.getByRole('button', { name: 'Randomly Select 3' })).toBeInTheDocument();
  });

  it('warns when fewer squares were claimed than asked for', async () => {
    const { toasts } = renderActions(makeViewer({ squaresLeft: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    fireEvent.click(screen.getByRole('button', { name: 'Randomly Select 2' }));
    await waitFor(() => expect(toasts()[0]?.message).toBe('Claimed 1 of 2 squares'));
  });

  it('sends the user to set initials when the server has none', async () => {
    api.useClaimRandomSquaresMutation.mockReturnValue(
      mockMutation({ error: { status: 422, message: 'Set your initials' } })
    );
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: 'Randomly Select 5' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/profile'));
  });

  it('reports a failed claim', async () => {
    api.useClaimRandomSquaresMutation.mockReturnValue(
      mockMutation({ error: { status: 409, message: 'Grid changed' } })
    );
    const { toasts } = renderActions();
    fireEvent.click(screen.getByRole('button', { name: 'Randomly Select 5' }));
    await waitFor(() =>
      expect(toasts()[0]).toMatchObject({ message: 'Grid changed', severity: 'warning' })
    );
  });

  it('labels why random claims are unavailable', () => {
    const { rerender } = renderActions(makeViewer({ squaresLeft: 0 }));
    expect(screen.getByRole('button', { name: 'No Squares Left' })).toBeDisabled();
    rerender(<SquareActions contest={makeContest()} viewer={makeViewer()} emptySquares={0} />);
    expect(screen.getByRole('button', { name: 'Grid Is Full' })).toBeDisabled();
  });

  it('clears the viewer’s own squares', async () => {
    const [clear, state] = mockMutation([]);
    api.useClearMySquaresMutation.mockReturnValue([clear, state]);
    renderActions(makeViewer({ squaresClaimed: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear My Squares' }));
    await waitFor(() => expect(clear).toHaveBeenCalledWith('c-1'));
  });

  it('reports a failed clear', async () => {
    api.useClearMySquaresMutation.mockReturnValue(
      mockMutation({ error: { status: 500, message: 'Nope' } })
    );
    const { toasts } = renderActions(makeViewer({ squaresClaimed: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear My Squares' }));
    await waitFor(() => expect(toasts()[0]?.message).toBe('Nope'));
  });
});
