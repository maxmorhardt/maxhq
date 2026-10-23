import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { contestsApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

const { endpoints } = contestsApi;

describe('contestsApi', () => {
  let fetch: ReturnType<typeof stubFetch>;
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    fetch = stubFetch({});
    store = makeStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const cases: [string, () => unknown, string, string][] = [
    [
      'createContest',
      () => endpoints.createContest.initiate({ name: 'x', owner: 'o', gameId: 'g' }),
      'POST',
      '/contests',
    ],
    ['deleteContest', () => endpoints.deleteContest.initiate('c'), 'DELETE', '/contests/c'],
    [
      'claimSquare',
      () => endpoints.claimSquare.initiate({ contestId: 'c', squareId: 's' }),
      'PUT',
      '/contests/c/squares/s/claim',
    ],
    [
      'clearSquare',
      () => endpoints.clearSquare.initiate({ contestId: 'c', squareId: 's' }),
      'DELETE',
      '/contests/c/squares/s/claim',
    ],
    [
      'claimRandomSquares',
      () => endpoints.claimRandomSquares.initiate({ contestId: 'c', count: 2 }),
      'POST',
      '/contests/c/squares/random',
    ],
    [
      'clearMySquares',
      () => endpoints.clearMySquares.initiate('c'),
      'DELETE',
      '/contests/c/squares/claims',
    ],
    ['getInvites', () => endpoints.getInvites.initiate('c'), 'GET', '/contests/c/invites'],
    [
      'createInvite',
      () =>
        endpoints.createInvite.initiate({
          contestId: 'c',
          request: { maxSquares: 1, role: 'participant' },
        }),
      'POST',
      '/contests/c/invites',
    ],
    [
      'deleteInvite',
      () => endpoints.deleteInvite.initiate({ contestId: 'c', inviteId: 'i' }),
      'DELETE',
      '/contests/c/invites/i',
    ],
    ['previewInvite', () => endpoints.previewInvite.initiate('t'), 'GET', '/invites/t'],
    ['redeemInvite', () => endpoints.redeemInvite.initiate('t'), 'POST', '/invites/t/redeem'],
    [
      'updateParticipant',
      () =>
        endpoints.updateParticipant.initiate({
          contestId: 'c',
          userId: 'u',
          request: { maxSquares: 2 },
        }),
      'PATCH',
      '/contests/c/participants/u',
    ],
    [
      'removeParticipant',
      () => endpoints.removeParticipant.initiate({ contestId: 'c', userId: 'u' }),
      'DELETE',
      '/contests/c/participants/u',
    ],
  ];

  it.each(cases)('%s calls the right endpoint', async (_, action, method, path) => {
    await store.dispatch(action() as never);
    expect(fetch.lastRequest()).toMatchObject({ method, path });
  });

  it('pages the feed with the cursor from the last page', async () => {
    fetch = stubFetch({ contests: [], nextCursor: 'next' });
    await store.dispatch(endpoints.getContestFeed.initiate({ role: 'owned' }));
    expect(fetch.lastRequest().url.searchParams.get('role')).toBe('owned');
    expect(fetch.lastRequest().url.searchParams.get('cursor')).toBeNull();

    await store.dispatch(
      endpoints.getContestFeed.initiate({ role: 'owned' }, { direction: 'forward' })
    );
    expect(fetch.lastRequest().url.searchParams.get('cursor')).toBe('next');
  });

  it('lists active contests from the feed', async () => {
    fetch = stubFetch({ contests: [{ id: 'c1', name: 'pool', role: 'owner' }] });
    const result = await store.dispatch(endpoints.getActiveContests.initiate());
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/contests' });
    expect(fetch.lastRequest().url.searchParams.get('status')).toBe('active');
    expect(result.data).toEqual([{ id: 'c1', name: 'pool', role: 'owner' }]);
  });
});
