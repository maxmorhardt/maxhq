import { isProduction } from './environment';
import { redactSecrets } from './faro';

const TAG_ID = 'AW-18549939904';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
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
  // contest pages put the contest name in the title
  window.gtag('set', {
    page_location: redactSecrets(window.location.href),
    page_referrer: redactSecrets(document.referrer),
    page_title: 'Squares',
  });
  window.gtag('config', TAG_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
  document.head.appendChild(script);
}
