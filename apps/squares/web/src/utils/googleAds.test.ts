import { afterEach, describe, expect, it, vi } from 'vitest';
import { initGoogleAds, trackConversion, trackConversionOnce } from './googleAds';

const tagScript = () =>
  document.head.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com"]');

const calls = () => window.dataLayer!.map((entry) => Array.from(entry as ArrayLike<unknown>));

describe('googleAds', () => {
  afterEach(() => {
    tagScript()?.remove();
    delete window.dataLayer;
    delete window.gtag;
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it.each(['localhost', 'squares.dev.maxhq.io'])('stays off on %s', (hostname) => {
    initGoogleAds(hostname);
    expect(tagScript()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('loads the tag in production', () => {
    initGoogleAds('squares.maxhq.io');

    expect(tagScript()?.src).toBe('https://www.googletagmanager.com/gtag/js?id=AW-18549939904');
    expect(calls()[1][0]).toBe('js');
    expect(calls()[3]).toEqual(['config', 'AW-18549939904']);
  });

  it('denies ad cookies in the EEA, the UK, and Switzerland before the tag configures', () => {
    initGoogleAds('squares.maxhq.io');

    const [command, mode, settings] = calls()[0] as [string, string, Record<string, unknown>];
    expect([command, mode]).toEqual(['consent', 'default']);
    expect(settings).toMatchObject({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    expect(settings.region).toEqual(expect.arrayContaining(['DE', 'FR', 'GB', 'CH', 'NO']));
    expect(settings.region).toHaveLength(32);
  });

  it('keeps invite tokens, the sign-in code and contest names away from google', () => {
    window.history.replaceState(null, '', '/join/abc-123?gclid=g1&code=c1&state=s1');
    initGoogleAds('squares.maxhq.io');

    expect(calls()[2]).toEqual([
      'set',
      {
        page_location: `${window.location.origin}/join/:token?gclid=g1&code=:redacted&state=:redacted`,
        page_referrer: '',
        page_title: 'Squares',
      },
    ]);
  });

  it('reports a conversion with its label once the tag is loaded', () => {
    initGoogleAds('squares.maxhq.io');
    trackConversion('contestCreated');

    expect(calls().at(-1)).toEqual([
      'event',
      'conversion',
      { send_to: 'AW-18549939904/nVsVCNjokbAdEMC9po1F' },
    ]);
  });

  it('swallows a tag that throws', () => {
    window.gtag = () => {
      throw new Error('blocked');
    };

    expect(() => trackConversion('contestCreated')).not.toThrow();
  });

  it('reports nothing where the tag never loaded', () => {
    expect(() => trackConversion('signedUp')).not.toThrow();
    expect(window.dataLayer).toBeUndefined();
  });

  it('reports a conversion once per id, with a transaction id google dedupes on', () => {
    initGoogleAds('squares.maxhq.io');
    trackConversionOnce('signedUp', 'u_pat');
    trackConversionOnce('signedUp', 'u_pat');

    const conversions = calls().filter(([command]) => command === 'event');
    expect(conversions).toEqual([
      [
        'event',
        'conversion',
        { send_to: 'AW-18549939904/1BJvCNiQlLAdEMC9po1F', transaction_id: 'signedUp:u_pat' },
      ],
    ]);
  });

  it('still reports when storage is blocked', () => {
    initGoogleAds('squares.maxhq.io');
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    trackConversionOnce('signedUp', 'u_pat');

    expect(calls().at(-1)?.[2]).toMatchObject({ transaction_id: 'signedUp:u_pat' });
    getItem.mockRestore();
  });
});
