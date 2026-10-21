import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../api/baseQuery';
import { notifySession } from './session';

describe('notifySession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the action with the token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await notifySession('sign-out', 'tok');

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/users/me/sign-out`,
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer tok' } })
    );
  });

  it('does nothing without a token and swallows failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);

    await notifySession('restore', undefined);
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(notifySession('restore', 'tok')).resolves.toBeUndefined();
  });
});
