import { isProduction } from './environment';
import { redactInviteTokens } from './faro';

const TAG_ID = 'AW-18549939904';

const OIDC_PARAMS = ['code', 'state', 'session_state', 'iss'];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function pageLocation(href: string): string {
  const url = new URL(redactInviteTokens(href));
  OIDC_PARAMS.forEach((param) => url.searchParams.delete(param));
  return url.toString();
}

export function initGoogleAds(hostname?: string): void {
  if (typeof window === 'undefined' || !isProduction(hostname)) {
    return;
  }

  const dataLayer = (window.dataLayer ??= []);
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js only reads Arguments objects, not arrays
    dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', TAG_ID, { page_location: pageLocation(window.location.href) });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
  document.head.appendChild(script);
}
