import { isProduction } from './environment';
import { redactSecrets } from './faro';

const TAG_ID = 'AW-18549939904';

const CONVERSION_LABELS = {
  contestCreated: 'nVsVCNjokbAdEMC9po1F',
  joinedContest: 'iYzxCNvokbAdEMC9po1F',
  signedUp: '1BJvCNiQlLAdEMC9po1F',
} as const;

export type Conversion = keyof typeof CONVERSION_LABELS;

// the EEA, the UK, and Switzerland, where ad cookies need consent we don't ask for
const CONSENT_REGIONS = [
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
];

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
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    region: CONSENT_REGIONS,
  });
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

// a no-op outside production, where the tag never loads
export function trackConversion(conversion: Conversion): void {
  window.gtag?.('event', 'conversion', { send_to: `${TAG_ID}/${CONVERSION_LABELS[conversion]}` });
}
