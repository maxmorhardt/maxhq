import { afterEach, describe, expect, it } from 'vitest';
import { initGoogleAds, pageLocation } from './googleAds';

const tagScript = () =>
  document.head.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com"]');

describe('googleAds', () => {
  afterEach(() => {
    tagScript()?.remove();
    delete window.dataLayer;
    delete window.gtag;
  });

  it.each(['localhost', 'squares.dev.maxhq.io'])('stays off on %s', (hostname) => {
    initGoogleAds(hostname);
    expect(tagScript()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('loads the tag in production', () => {
    initGoogleAds('squares.maxhq.io');

    expect(tagScript()?.src).toBe('https://www.googletagmanager.com/gtag/js?id=AW-18549939904');
    const calls = window.dataLayer!.map((entry) => Array.from(entry as ArrayLike<unknown>));
    expect(calls[0][0]).toBe('js');
    expect(calls[1]).toEqual([
      'config',
      'AW-18549939904',
      { page_location: pageLocation(window.location.href) },
    ]);
  });

  it('redacts invite tokens', () => {
    expect(pageLocation('https://squares.maxhq.io/join/abc-123?gclid=g1')).toBe(
      'https://squares.maxhq.io/join/:token?gclid=g1'
    );
  });

  it('drops the oidc response from the callback url', () => {
    expect(
      pageLocation('https://squares.maxhq.io/auth/callback?code=c&state=s&iss=i&gclid=g1')
    ).toBe('https://squares.maxhq.io/auth/callback?gclid=g1');
  });
});
