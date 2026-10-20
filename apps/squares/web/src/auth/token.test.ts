import { beforeEach, describe, expect, it, vi } from 'vitest';

const manager = { getUser: vi.fn(), signinSilent: vi.fn(), removeUser: vi.fn() };
vi.mock('./userManager', () => ({ getUserManager: () => manager }));

import { getIdToken, refreshSession, signOutLocally } from './token';

const user = (expiresIn: number | undefined, idToken = 'old') => ({
  id_token: idToken,
  expires_in: expiresIn,
  expired: expiresIn !== undefined && expiresIn <= 0,
});

describe('getIdToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when nobody is signed in', async () => {
    manager.getUser.mockResolvedValue(null);
    expect(await getIdToken()).toBeNull();
  });

  it('returns the stored token while it has time left', async () => {
    manager.getUser.mockResolvedValue(user(600));
    expect(await getIdToken()).toBe('old');
    expect(manager.signinSilent).not.toHaveBeenCalled();
  });

  it('refreshes a token that is about to expire', async () => {
    manager.getUser.mockResolvedValue(user(30));
    manager.signinSilent.mockResolvedValue(user(3600, 'new'));
    expect(await getIdToken()).toBe('new');
  });

  it('keeps an unexpired token when the refresh fails', async () => {
    manager.getUser.mockResolvedValue(user(30));
    manager.signinSilent.mockRejectedValue(new Error('offline'));
    expect(await getIdToken()).toBe('old');
  });

  it('gives up on an expired token when the refresh fails', async () => {
    manager.getUser.mockResolvedValue(user(-5));
    manager.signinSilent.mockResolvedValue(null);
    expect(await getIdToken()).toBeNull();
  });

  it('refreshes on demand even with time left', async () => {
    manager.getUser.mockResolvedValue(user(600));
    manager.signinSilent.mockResolvedValue(user(3600, 'new'));
    expect(await getIdToken({ forceRefresh: true })).toBe('new');
  });
});

describe('refreshSession', () => {
  it('shares one refresh between concurrent callers', async () => {
    manager.signinSilent.mockClear();
    manager.signinSilent.mockResolvedValue(user(3600, 'new'));
    await Promise.all([refreshSession(), refreshSession()]);
    expect(manager.signinSilent).toHaveBeenCalledTimes(1);
  });
});

describe('signOutLocally', () => {
  it('drops the stored user', async () => {
    await signOutLocally();
    expect(manager.removeUser).toHaveBeenCalled();
  });
});
