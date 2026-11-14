import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMutation } from '../../../test/auth';
import { makePlayer } from '../../../test/fixtures';
import { renderWithProviders } from '../../../test/render';
import JoinInvite from './JoinInvite';

const api = vi.hoisted(() => ({
  usePreviewInviteQuery: vi.fn(),
  useJoinContestMutation: vi.fn(),
}));
vi.mock('../../contests/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
const ads = vi.hoisted(() => ({ trackConversion: vi.fn() }));
vi.mock('../../../utils/googleAds', () => ads);
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', async () => ({
  ...(await vi.importActual<typeof import('react-router')>('react-router')),
  useNavigate: () => navigate,
}));

const preview = {
  contestId: 'c-1',
  contestName: 'Office Pool',
  status: 'ACTIVE',
};

describe('JoinInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.usePreviewInviteQuery.mockReturnValue({ data: preview, error: undefined });
    api.useJoinContestMutation.mockReturnValue(mockMutation(makePlayer({ contestId: 'c-1' })));
  });

  it('joins and opens the contest', async () => {
    const { store } = renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Joining contest...')).toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/c-1', { replace: true }));
    expect(store.getState().toast.messages[0]?.message).toBe('You joined Office Pool');
    expect(ads.trackConversion).toHaveBeenCalledWith('joinedContest');
  });

  it('tells someone joining after kickoff that they can watch', async () => {
    api.usePreviewInviteQuery.mockReturnValue({
      data: { ...preview, status: 'Q2' },
      error: undefined,
    });
    const { store } = renderWithProviders(<JoinInvite token="tok" />);
    await waitFor(() =>
      expect(store.getState().toast.messages[0]?.message).toBe(
        'You joined Office Pool. The game’s on, so you can watch.'
      )
    );
  });

  it('waits for the invite to load', () => {
    api.usePreviewInviteQuery.mockReturnValue({ data: undefined, error: undefined });
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Loading invite...')).toBeInTheDocument();
  });

  it('opens the contest for someone already in it', async () => {
    api.useJoinContestMutation.mockReturnValue(
      mockMutation(
        { error: { status: 409, message: 'Already joined' } },
        { error: { status: 409, message: 'Already joined' } }
      )
    );
    renderWithProviders(<JoinInvite token="tok" />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/contests/c-1', { replace: true }));
    expect(screen.queryByText('Unable to Join')).not.toBeInTheDocument();
  });

  it('explains an invalid invite', () => {
    api.usePreviewInviteQuery.mockReturnValue({
      data: undefined,
      error: { status: 404, message: 'Invite expired' },
    });
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Invite expired')).toBeInTheDocument();
  });

  it('explains a ban', () => {
    api.useJoinContestMutation.mockReturnValue(
      mockMutation(
        { error: { status: 403, message: 'the owner removed you from this contest' } },
        { error: { status: 403, message: 'the owner removed you from this contest' } }
      )
    );
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('the owner removed you from this contest')).toBeInTheDocument();
  });

  it('falls back to a plain message when the join fails without one', () => {
    api.useJoinContestMutation.mockReturnValue(
      mockMutation({ error: { status: 500 } }, { error: { status: 500 } })
    );
    renderWithProviders(<JoinInvite token="tok" />);
    expect(screen.getByText('Unable to Join')).toBeInTheDocument();
  });
});
