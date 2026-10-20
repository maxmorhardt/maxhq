import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { landingApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('landingApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the site stats', async () => {
    const fetch = stubFetch({ totalActiveContests: 2 });
    const result = await makeStore().dispatch(landingApi.endpoints.getSiteStats.initiate());
    expect(fetch.lastRequest()).toMatchObject({ method: 'GET', path: '/stats' });
    expect(result.data).toEqual({ totalActiveContests: 2 });
  });
});
