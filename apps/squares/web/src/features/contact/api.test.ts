import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import { stubFetch } from '../../test/api';
import { contactApi } from './api';

vi.mock('../../auth/token', () => ({
  getIdToken: vi.fn().mockResolvedValue(null),
  signOutLocally: vi.fn(),
}));

describe('contactApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the contact form', async () => {
    const fetch = stubFetch({ message: 'thanks' });
    await makeStore().dispatch(
      contactApi.endpoints.submitContact.initiate({
        name: 'a',
        email: 'a@x.com',
        subject: 's',
        message: 'm',
        turnstileToken: 't',
      })
    );
    expect(fetch.lastRequest()).toMatchObject({ method: 'POST', path: '/contact' });
  });
});
