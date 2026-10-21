import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, isAndroid, isInAppBrowser } from './inAppBrowser';

const safari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const instagram =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0';
const androidWebView =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36';
const androidChrome =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

describe('isInAppBrowser', () => {
  it('spots browsers built into apps', () => {
    expect(isInAppBrowser(instagram)).toBe(true);
    expect(isInAppBrowser(androidWebView)).toBe(true);
    expect(isInAppBrowser('Mozilla/5.0 [FBAN/FBIOS;FBAV/450.0]')).toBe(true);
  });

  it('leaves real browsers alone', () => {
    expect(isInAppBrowser(safari)).toBe(false);
    expect(isInAppBrowser(androidChrome)).toBe(false);
  });

  it('reads the current browser by default', () => {
    expect(isInAppBrowser()).toBe(false);
  });
});

describe('isAndroid', () => {
  it('tells Android from iOS', () => {
    expect(isAndroid(androidChrome)).toBe(true);
    expect(isAndroid(safari)).toBe(false);
  });
});

describe('chromeIntentUrl', () => {
  it('reopens the same page in Chrome', () => {
    expect(chromeIntentUrl('https://squares.maxhq.io/join/abc?x=1#top')).toBe(
      'intent://squares.maxhq.io/join/abc?x=1#top#Intent;scheme=https;package=com.android.chrome;end'
    );
  });
});
