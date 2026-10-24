import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts';
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
    manager.signinSilent.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await getIdToken()).toBe('old');
  });

  it('gives up on an expired token when the refresh fails', async () => {
    manager.getUser.mockResolvedValue(user(-5));
    manager.signinSilent.mockResolvedValue(null);
    expect(await getIdToken()).toBeNull();
  });

  it('stops waiting on a refresh that hangs', async () => {
    vi.useFakeTimers();
    manager.getUser.mockResolvedValue(user(30));
    let release: (value: null) => void = () => {};
    manager.signinSilent.mockReturnValue(new Promise((resolve) => (release = resolve)));

    const token = getIdToken();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(await token).toBe('old');
    // let the shared refresh finish so later callers start their own
    release(null);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
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

  describe('when the provider rejects the refresh', () => {
    const rejected = new ErrorResponse({ error: 'server_error' });

    beforeEach(async () => {
      // a success clears any rejections left over from earlier tests
      manager.signinSilent.mockResolvedValueOnce(user(3600, 'new'));
      await refreshSession();
      vi.clearAllMocks();
    });

    it('keeps the session after one rejection', async () => {
      manager.signinSilent.mockRejectedValue(rejected);
      expect(await refreshSession()).toBeNull();
      expect(manager.removeUser).not.toHaveBeenCalled();
    });

    it('drops the session after repeated rejections', async () => {
      manager.signinSilent.mockRejectedValue(new Error('Internal Server Error (500)'));
      await refreshSession();
      await refreshSession();
      expect(manager.removeUser).toHaveBeenCalledTimes(1);
    });

    it('starts counting again after a refresh succeeds', async () => {
      manager.signinSilent.mockRejectedValueOnce(rejected);
      manager.signinSilent.mockResolvedValueOnce(user(3600, 'new'));
      manager.signinSilent.mockRejectedValueOnce(rejected);
      await refreshSession();
      await refreshSession();
      await refreshSession();
      expect(manager.removeUser).not.toHaveBeenCalled();
    });

    it('keeps the session while the provider is unreachable', async () => {
      manager.signinSilent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      manager.signinSilent.mockRejectedValueOnce(new ErrorTimeout('Network timed out'));
      manager.signinSilent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await refreshSession();
      await refreshSession();
      await refreshSession();
      expect(manager.removeUser).not.toHaveBeenCalled();
    });
  });
});

describe('signOutLocally', () => {
  it('drops the stored user', async () => {
    await signOutLocally();
    expect(manager.removeUser).toHaveBeenCalled();
  });
});
