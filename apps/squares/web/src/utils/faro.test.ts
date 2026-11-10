import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ setUser: vi.fn(), resetUser: vi.fn(), pushEvent: vi.fn() }));
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
    sessionStorage.clear();
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

    setFaroUser('u_1', 'a@x.com');
    await vi.waitFor(() =>
      expect(api.setUser).toHaveBeenCalledWith({ id: 'u_1', email: 'a@x.com' })
    );

    setFaroUser('u_2');
    await vi.waitFor(() => expect(api.setUser).toHaveBeenLastCalledWith({ id: 'u_2' }));

    setFaroUser(undefined, 'b@x.com');
    await vi.waitFor(() => expect(api.setUser).toHaveBeenLastCalledWith({ email: 'b@x.com' }));

    setFaroUser(undefined);
    await vi.waitFor(() => expect(api.resetUser).toHaveBeenCalled());
  });

  it('records where the visit landed from', async () => {
    const { initFaro } = await load();
    initFaro('squares.maxhq.io', URL);
    await vi.waitFor(() =>
      expect(api.pushEvent).toHaveBeenCalledWith('landing', expect.any(Object))
    );
  });

  it('records a landing once per tab, not on the sign-in callback or a reload', async () => {
    const first = await load();
    first.initFaro('squares.maxhq.io', URL);
    await vi.waitFor(() => expect(api.pushEvent).toHaveBeenCalledTimes(1));

    const reload = await load();
    reload.initFaro('squares.maxhq.io', URL);
    await vi.waitFor(() => expect(initializeFaro).toHaveBeenCalledTimes(2));
    expect(api.pushEvent).toHaveBeenCalledTimes(1);
  });

  it('reads the campaign, ad click, and referrer from a landing url', async () => {
    const { landingAttributes } = await load();

    expect(
      landingAttributes(
        'https://squares.maxhq.io/?utm_source=google&utm_medium=cpc&utm_campaign=squares-search&gad_campaignid=9&gclid=abc&x=1',
        'https://www.google.com/'
      )
    ).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'squares-search',
      gad_campaignid: '9',
      ad_click: 'google',
      referrer: 'www.google.com',
    });
  });

  it('tells a facebook click from a direct visit', async () => {
    const { landingAttributes } = await load();

    expect(landingAttributes('https://squares.maxhq.io/contests/c1?fbclid=f', '')).toEqual({
      ad_click: 'facebook',
    });
    expect(landingAttributes('https://squares.maxhq.io/', 'not a url')).toEqual({});
  });

  it('strips invite tokens from everything it sends', async () => {
    const { redactSecrets } = await load();
    const item = {
      meta: { page: { url: 'https://squares.maxhq.io/join/abc123?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/abc123/join' },
      other: 'https://api.maxhq.io/squares/contests/c1/invite',
    };

    expect(redactSecrets(item)).toEqual({
      meta: { page: { url: 'https://squares.maxhq.io/join/:token?x=1' } },
      payload: { name: 'https://api.maxhq.io/squares/invites/:token/join' },
      other: 'https://api.maxhq.io/squares/contests/c1/invite',
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

  it('pushes a named event once faro is up', async () => {
    const { initFaro, trackEvent } = await load();
    initFaro('squares.maxhq.io', URL);
    trackEvent('sign_in_provider', { provider: 'google' });
    await vi.waitFor(() =>
      expect(api.pushEvent).toHaveBeenCalledWith('sign_in_provider', { provider: 'google' })
    );
  });

  it('drops events when faro is off', async () => {
    const { trackEvent } = await load();
    trackEvent('sign_in_provider');
    await Promise.resolve();
    expect(api.pushEvent).not.toHaveBeenCalled();
  });

  it('ignores the user before faro starts', async () => {
    const { setFaroUser } = await load();
    setFaroUser('u_1');
    await Promise.resolve();
    expect(api.setUser).not.toHaveBeenCalled();
  });
});
