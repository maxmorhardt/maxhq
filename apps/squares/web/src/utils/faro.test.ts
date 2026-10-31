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

    setFaroUser({ sub: 'u1', email: 'a@example.com', name: 'A' });
    await vi.waitFor(() =>
      expect(api.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@example.com', username: 'A' })
    );

    setFaroUser(undefined);
    await vi.waitFor(() => expect(api.resetUser).toHaveBeenCalled());
  });

  it('strips invite tokens from everything it sends', async () => {
    const { redactInviteTokens } = await load();
    const item = {
      meta: { page: { url: 'https://squares.maxhq.io/join/abc123?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/abc123/redeem' },
      other: 'https://api.maxhq.io/squares/contests/c1/invites',
    };

    expect(redactInviteTokens(item)).toEqual({
      meta: { page: { url: 'https://squares.maxhq.io/join/:token?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/:token/redeem' },
      other: 'https://api.maxhq.io/squares/contests/c1/invites',
    });
  });

  it('redacts before sending', async () => {
    const { initFaro, redactInviteTokens } = await load();
    initFaro('squares.maxhq.io', URL);
    await vi.dynamicImportSettled();
    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({ beforeSend: redactInviteTokens })
    );
  });

  it('ignores the user before faro starts', async () => {
    const { setFaroUser } = await load();
    setFaroUser({ sub: 'u1' });
    await Promise.resolve();
    expect(api.setUser).not.toHaveBeenCalled();
  });
});
