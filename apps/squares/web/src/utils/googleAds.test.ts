import { afterEach, describe, expect, it } from 'vitest';
import { initGoogleAds } from './googleAds';

const tagScript = () =>
  document.head.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com"]');

const calls = () => window.dataLayer!.map((entry) => Array.from(entry as ArrayLike<unknown>));

describe('googleAds', () => {
  afterEach(() => {
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
    expect(calls()[0][0]).toBe('js');
    expect(calls()[2]).toEqual(['config', 'AW-18549939904']);
  });

  it('keeps invite tokens, the sign-in code and contest names away from google', () => {
    window.history.replaceState(null, '', '/join/abc-123?gclid=g1&code=c1&state=s1');
    initGoogleAds('squares.maxhq.io');

    expect(calls()[1]).toEqual([
      'set',
      {
        page_location: `${window.location.origin}/join/:token?gclid=g1&code=:redacted&state=:redacted`,
        page_referrer: '',
        page_title: 'Squares',
      },
    ]);
  });
});
