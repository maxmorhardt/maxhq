import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { gamesApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('gamesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the current week without parameters', async () => {
    const fetch = stubFetch({ season: 2026, seasonType: 2, week: 7, games: [] });
    const result = await makeStore().dispatch(gamesApi.endpoints.getScoreboard.initiate(undefined));
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/games/scoreboard' });
    expect(fetch.lastRequest().url.search).toBe('');
    expect(result.data?.week).toBe(7);
  });

  it('asks for a chosen week', async () => {
    const fetch = stubFetch({ games: [] });
    await makeStore().dispatch(
      gamesApi.endpoints.getScoreboard.initiate({ season: 2026, seasonType: 3, week: 2 })
    );
    expect(fetch.lastRequest().url.searchParams.get('seasonType')).toBe('3');
    expect(fetch.lastRequest().url.searchParams.get('week')).toBe('2');
  });

  it('fetches the upcoming games and a single game', async () => {
    const fetch = stubFetch([]);
    const store = makeStore();
    await store.dispatch(gamesApi.endpoints.getUpcomingGames.initiate());
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/games/upcoming' });

    await store.dispatch(gamesApi.endpoints.getGame.initiate('g-1'));
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/games/g-1' });
  });
});
