// browsers built into social and chat apps; Google refuses to sign in inside them (disallowed_useragent)
const IN_APP_BROWSER =
  /FBAN|FBAV|FB_IAB|Instagram|Messenger|LinkedInApp|Snapchat|TikTok|musical_ly|BytedanceWebview|Twitter|Line\/|KAKAOTALK|MicroMessenger|Pinterest|; wv\)/i;

export function isInAppBrowser(userAgent: string = globalThis.navigator?.userAgent ?? ''): boolean {
  return IN_APP_BROWSER.test(userAgent);
}

export function isAndroid(userAgent: string = globalThis.navigator?.userAgent ?? ''): boolean {
  return /Android/i.test(userAgent);
}

// an Android intent that reopens the page in Chrome, outside the app it was tapped in
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;end`;
}
