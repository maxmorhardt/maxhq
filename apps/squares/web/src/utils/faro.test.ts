import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ setUser: vi.fn(), resetUser: vi.fn() }));
const initializeFaro = vi.hoisted(() => vi.fn(() => ({ api })));
vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro,
  getWebInstrumentations: () => [],
}));

const URL = 'https://collector.example/collect/key';

async function load() {
  vi.resetModules();
  return import('./faro');
}

describe('faro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays off without a collector url', async () => {
    const { initFaro } = await load();
    initFaro('squares.maxhq.io', '');
    await vi.dynamicImportSettled();
    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it('stays off on localhost', async () => {
    const { initFaro } = await load();
    initFaro('localhost', URL);
    await vi.dynamicImportSettled();
    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it.each([
    ['squares.maxhq.io', 'production'],
    ['squares.dev.maxhq.io', 'development'],
  ])('tags %s as %s', async (hostname, environment) => {
    const { initFaro } = await load();
    initFaro(hostname, URL);
    await vi.dynamicImportSettled();
    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({ url: URL, app: { name: 'squares', environment } })
    );
  });

  it('sets and resets the signed-in user', async () => {
    const { initFaro, setFaroUser } = await load();
    initFaro('squares.maxhq.io', URL);

    setFaroUser('u_1');
    await vi.waitFor(() => expect(api.setUser).toHaveBeenCalledWith({ id: 'u_1' }));

    setFaroUser(undefined);
    await vi.waitFor(() => expect(api.resetUser).toHaveBeenCalled());
  });

  it('strips invite tokens from everything it sends', async () => {
    const { redactSecrets } = await load();
    const item = {
      meta: { page: { url: 'https://squares.maxhq.io/join/abc123?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/abc123/redeem' },
      other: 'https://api.maxhq.io/squares/contests/c1/invites',
    };

    expect(redactSecrets(item)).toEqual({
      meta: { page: { url: 'https://squares.maxhq.io/join/:token?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/:token/redeem' },
      other: 'https://api.maxhq.io/squares/contests/c1/invites',
    });
  });

  it('keeps a quoted invite url in an error message valid', async () => {
    const { redactSecrets } = await load();
    const item = { payload: { value: 'Failed to load "https://squares.maxhq.io/join/abc123"' } };

    expect(redactSecrets(item)).toEqual({
      payload: { value: 'Failed to load "https://squares.maxhq.io/join/:token"' },
    });
  });

  it('keeps the line break after a token in a stack trace', async () => {
    const { redactSecrets } = await load();
    const item = {
      payload: {
        stack:
          'at load (https://squares.maxhq.io/join/abc123)\nat next (https://squares.maxhq.io/a.js)',
      },
    };

    expect(redactSecrets(item)).toEqual({
      payload: {
        stack:
          'at load (https://squares.maxhq.io/join/:token)\nat next (https://squares.maxhq.io/a.js)',
      },
    });
  });

  it('redacts the sign-in callback code and state', async () => {
    const { redactSecrets } = await load();
    const item = {
      meta: { page: { url: 'https://squares.maxhq.io/auth/callback?code=c1&state=s1&iss=i' } },
      payload: { value: 'Failed "https://squares.maxhq.io/auth/callback?state=s1"' },
    };

    expect(redactSecrets(item)).toEqual({
      meta: {
        page: {
          url: 'https://squares.maxhq.io/auth/callback?code=:redacted&state=:redacted&iss=i',
        },
      },
      payload: { value: 'Failed "https://squares.maxhq.io/auth/callback?state=:redacted"' },
    });
  });

  it('redacts before sending', async () => {
    const { initFaro, redactSecrets } = await load();
    initFaro('squares.maxhq.io', URL);
    await vi.dynamicImportSettled();
    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({ beforeSend: redactSecrets })
    );
  });

  it('ignores the user before faro starts', async () => {
    const { setFaroUser } = await load();
    setFaroUser('u_1');
    await Promise.resolve();
    expect(api.setUser).not.toHaveBeenCalled();
  });
});
