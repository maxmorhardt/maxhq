import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { profileApi } from './api';

const ads = vi.hoisted(() => ({ trackConversion: vi.fn() }));
vi.mock('../../utils/googleAds', () => ads);
vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('profileApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    ads.trackConversion.mockClear();
  });

  const cases: [string, () => unknown, string, string][] = [
    ['getMyProfile', () => profileApi.endpoints.getMyProfile.initiate(), 'GET', '/users/me'],
    [
      'updateMyProfile',
      () => profileApi.endpoints.updateMyProfile.initiate({ defaultInitials: 'AB' }),
      'PATCH',
      '/users/me',
    ],
    ['getMyStats', () => profileApi.endpoints.getMyStats.initiate(), 'GET', '/stats/me'],
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

  it('counts a sign-up only when accounts just created the profile', async () => {
    stubFetch({ userId: 'u_1', isNew: true });
    await makeStore().dispatch(profileApi.endpoints.getMyProfile.initiate());
    expect(ads.trackConversion).toHaveBeenCalledExactlyOnceWith('signedUp');

    ads.trackConversion.mockClear();
    stubFetch({ userId: 'u_1' });
    await makeStore().dispatch(profileApi.endpoints.getMyProfile.initiate());
    expect(ads.trackConversion).not.toHaveBeenCalled();
  });
});
