import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { profileApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('profileApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const cases: [string, () => unknown, string, string][] = [
    ['getMyProfile', () => profileApi.endpoints.getMyProfile.initiate(), 'GET', '/users/me'],
    [
      'updateMyProfile',
      () => profileApi.endpoints.updateMyProfile.initiate({ defaultInitials: 'AB' }),
      'PATCH',
      '/users/me',
    ],
    ['getMyStats', () => profileApi.endpoints.getMyStats.initiate(), 'GET', '/users/me/stats'],
    [
      'deleteMyAccount',
      () => profileApi.endpoints.deleteMyAccount.initiate(),
      'DELETE',
      '/users/me',
    ],
  ];

  it.each(cases)('%s calls the right endpoint', async (_, action, method, path) => {
    const fetch = stubFetch({});
    await makeStore().dispatch(action() as never);
    expect(fetch.lastRequest()).toMatchObject({ method, path });
  });

  it('treats a null active contest list as empty', async () => {
    stubFetch(null);
    const result = await makeStore().dispatch(profileApi.endpoints.getMyActiveContests.initiate());
    expect(result.data).toEqual([]);
  });
});
