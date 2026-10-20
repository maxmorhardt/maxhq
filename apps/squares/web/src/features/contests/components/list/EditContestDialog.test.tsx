import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, mockMutation } from '../../../../test/auth';
import { renderWithProviders } from '../../../../test/render';
import type { ContestSummary } from '../../../../types/contest';
import EditContestDialog from './EditContestDialog';

vi.mock('react-oidc-context', () => ({ useAuth: vi.fn() }));
const api = vi.hoisted(() => ({ useUpdateContestMutation: vi.fn() }));
vi.mock('../../api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const contest: ContestSummary = {
  id: 'c-1',
  name: 'Office Pool',
  homeTeam: 'Lions',
  awayTeam: 'Bears',
  status: 'ACTIVE',
  visibility: 'private',
  owner: 'owner@x.com',
  role: 'owner',
  claimedSquares: 0,
  mySquares: 0,
  version: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderDialog(overrides: Partial<ContestSummary> = {}) {
  const onClose = vi.fn();
  const result = renderWithProviders(
    <EditContestDialog contest={{ ...contest, ...overrides }} onClose={onClose} />
  );
  return { ...result, onClose };
}

describe('EditContestDialog', () => {
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAuth({ email: 'owner@x.com' });
    const [trigger, state] = mockMutation(contest);
    update = trigger;
    api.useUpdateContestMutation.mockReturnValue([trigger, state]);
  });

  it('renders nothing without a contest', () => {
    renderWithProviders(<EditContestDialog contest={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the linked game', () => {
    renderDialog();
    expect(screen.getByText('Bears @ Lions')).toBeInTheDocument();
  });

  it('saves the visibility with the contest version', async () => {
    const { onClose, store } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Public' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({
      id: 'c-1',
      updates: { visibility: 'public' },
      version: 3,
    });
    expect(store.getState().toast.messages[0]?.message).toBe('Contest updated successfully');
  });

  it('reports a failed save and stays open', async () => {
    api.useUpdateContestMutation.mockReturnValue(
      mockMutation({ error: { status: 412, message: 'Changed elsewhere' } })
    );
    const { onClose, store } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe('Changed elsewhere')
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is read-only for anyone but the owner, or once finished', () => {
    mockAuth({ email: 'other@x.com' });
    const { rerender } = renderDialog();
    expect(screen.getByText('View Contest')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();

    mockAuth({ email: 'owner@x.com' });
    rerender(<EditContestDialog contest={{ ...contest, status: 'FINISHED' }} onClose={vi.fn()} />);
    expect(screen.getByText('View Contest')).toBeInTheDocument();
  });
});
