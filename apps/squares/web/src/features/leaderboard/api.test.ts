import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { leaderboardApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('leaderboardApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the leaderboard entries', async () => {
    stubFetch({ entries: [{ rank: 1 }] });
    const result = await makeStore().dispatch(leaderboardApi.endpoints.getLeaderboard.initiate());
    expect(result.data).toEqual([{ rank: 1 }]);
  });

  it('fetches the signed-in rank', async () => {
    const fetch = stubFetch({ rank: 3 });
    await makeStore().dispatch(leaderboardApi.endpoints.getMyRank.initiate());
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/leaderboard/me' });
  });
});
