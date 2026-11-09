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
      () => endpoints.createContest.initiate({ name: 'x', gameId: 'g' }),
      'POST',
      '/contests',
    ],
    ['getContest', () => endpoints.getContest.initiate('c'), 'GET', '/contests/c'],
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
    ['getInviteLink', () => endpoints.getInviteLink.initiate('c'), 'GET', '/contests/c/invite'],
    [
      'resetInviteLink',
      () => endpoints.resetInviteLink.initiate('c'),
      'POST',
      '/contests/c/invite/reset',
    ],
    ['previewInvite', () => endpoints.previewInvite.initiate('t'), 'GET', '/invites/t'],
    ['joinContest', () => endpoints.joinContest.initiate('t'), 'POST', '/invites/t/join'],
    [
      'updatePlayer',
      () => endpoints.updatePlayer.initiate({ contestId: 'c', userId: 'u', maxSquares: 2 }),
      'PATCH',
      '/contests/c/players/u',
    ],
    [
      'allotSquares',
      () => endpoints.allotSquares.initiate({ contestId: 'c', maxSquares: 3 }),
      'POST',
      '/contests/c/players/allot',
    ],
    [
      'removePlayer',
      () => endpoints.removePlayer.initiate({ contestId: 'c', userId: 'u' }),
      'DELETE',
      '/contests/c/players/u',
    ],
    ['getBans', () => endpoints.getBans.initiate('c'), 'GET', '/contests/c/bans'],
    [
      'unbanPlayer',
      () => endpoints.unbanPlayer.initiate({ contestId: 'c', userId: 'u' }),
      'DELETE',
      '/contests/c/bans/u',
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

  it('sends the new square limit as the body', async () => {
    await store.dispatch(
      endpoints.updatePlayer.initiate({ contestId: 'c', userId: 'u', maxSquares: 0 })
    );
    expect(await fetch.lastRequest().request.json()).toEqual({ maxSquares: 0 });
  });

  it('puts a reset link straight into the cached invite link', async () => {
    fetch = stubFetch({ token: 'old' });
    await store.dispatch(endpoints.getInviteLink.initiate('c'));
    fetch = stubFetch({ token: 'fresh' });
    await store.dispatch(endpoints.resetInviteLink.initiate('c'));
    await vi.waitFor(() =>
      expect(endpoints.getInviteLink.select('c')(store.getState()).data).toEqual({ token: 'fresh' })
    );
  });

  it('asks the feed whether the viewer has finished a contest of their own', async () => {
    fetch = stubFetch({ contests: [{ id: 'c1' }] });
    const result = await store.dispatch(endpoints.hasFinishedOwnContest.initiate());
    const params = fetch.lastRequest().url.searchParams;
    expect([params.get('role'), params.get('status'), params.get('limit')]).toEqual([
      'owned',
      'finished',
      '1',
    ]);
    expect(result.data).toBe(true);

    fetch = stubFetch({ contests: [] });
    store = makeStore();
    expect((await store.dispatch(endpoints.hasFinishedOwnContest.initiate())).data).toBe(false);
  });

  it('lists active contests from the feed', async () => {
    fetch = stubFetch({ contests: [{ id: 'c1', name: 'pool', role: 'owner' }] });
    const result = await store.dispatch(endpoints.getActiveContests.initiate());
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/contests' });
    expect(fetch.lastRequest().url.searchParams.get('status')).toBe('active');
    expect(result.data).toEqual([{ id: 'c1', name: 'pool', role: 'owner' }]);
  });
});
