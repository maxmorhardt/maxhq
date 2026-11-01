import { afterEach, describe, expect, it, vi } from 'vitest';
import { initGoogleAds, trackConversion, trackConversionFor } from './googleAds';

const tagScript = () =>
  document.head.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com"]');

const calls = () => window.dataLayer!.map((entry) => Array.from(entry as ArrayLike<unknown>));

describe('googleAds', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tagScript()?.remove();
    delete window.dataLayer;
    delete window.gtag;
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

  it('resends a conversion with the same transaction id, which google dedupes on', () => {
    initGoogleAds('squares.maxhq.io');
    trackConversionFor('signedUp', 'u_pat');
    trackConversionFor('signedUp', 'u_pat');

    const conversion = [
      'event',
      'conversion',
      { send_to: 'AW-18549939904/1BJvCNiQlLAdEMC9po1F', transaction_id: 'signedUp:u_pat' },
    ];
    expect(calls().filter(([command]) => command === 'event')).toEqual([conversion, conversion]);
  });

  it('retries after a tag that threw, since nothing marks the conversion as sent', () => {
    initGoogleAds('squares.maxhq.io');
    const gtag = window.gtag!;
    window.gtag = () => {
      throw new Error('blocked');
    };
    trackConversionFor('signedUp', 'u_retry');
    window.gtag = gtag;
    trackConversionFor('signedUp', 'u_retry');

    expect(calls().at(-1)?.[2]).toMatchObject({ transaction_id: 'signedUp:u_retry' });
  });

  it('never writes to device storage', () => {
    initGoogleAds('squares.maxhq.io');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    trackConversionFor('signedUp', 'u_storage');

    expect(setItem).not.toHaveBeenCalled();
    expect(calls().at(-1)?.[2]).toMatchObject({ transaction_id: 'signedUp:u_storage' });
  });
});
