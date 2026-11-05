import type { Faro } from '@grafana/faro-web-sdk';
import { appDomain, isProduction } from './environment';

const FARO_URL =
  'https://faro-collector-prod-us-east-2.grafana.net/collect/4c8da302ecf785b47cd7f5dbc361767c';

const INVITE_TOKEN = /\/(join|invites)\/[\w-]+/g;
const OIDC_PARAM = /([?&](?:code|state|session_state)=)[^&#"\s\\]+/g;

const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'gad_campaignid'];
const CLICK_IDS: Record<string, string> = {
  gclid: 'google',
  gbraid: 'google',
  wbraid: 'google',
  fbclid: 'facebook',
};
const LANDED_KEY = 'squares.faro.landed';

let loaded: Promise<Faro | null> = Promise.resolve(null);

// page urls, resource timings and errors can carry an invite link or the sign-in callback's code
export function redactSecrets<T>(item: T): T {
  return JSON.parse(
    JSON.stringify(item).replace(INVITE_TOKEN, '/$1/:token').replace(OIDC_PARAM, '$1:redacted')
  ) as T;
}

export function landingAttributes(href: string, referrer: string): Record<string, string> {
  const params = new URL(href).searchParams;
  const attributes: Record<string, string> = {};
  for (const key of CAMPAIGN_PARAMS) {
    const value = params.get(key);
    if (value) {
      attributes[key] = value;
    }
  }
  const clickId = Object.keys(CLICK_IDS).find((key) => params.has(key));
  if (clickId) {
    attributes.ad_click = CLICK_IDS[clickId];
  }
  try {
    attributes.referrer = new URL(referrer).hostname;
  } catch {
    return attributes;
  }
  return attributes;
}

function firstLoadInTab(): boolean {
  try {
    if (sessionStorage.getItem(LANDED_KEY)) {
      return false;
    }
    sessionStorage.setItem(LANDED_KEY, '1');
  } catch {
    return true;
  }
  return true;
}

// loaded lazily so the SDK stays out of the main bundle
export function initFaro(hostname?: string, url: string = FARO_URL): void {
  if (typeof window === 'undefined' || !url || !appDomain(hostname)) {
    return;
  }

  loaded = import('@grafana/faro-web-sdk')
    .then(({ getWebInstrumentations, initializeFaro }) => {
      const faro = initializeFaro({
        url,
        app: {
          name: 'squares',
          environment: isProduction(hostname) ? 'production' : 'development',
        },
        instrumentations: getWebInstrumentations(),
        beforeSend: redactSecrets,
      });
      if (firstLoadInTab()) {
        faro.api.pushEvent('landing', landingAttributes(window.location.href, document.referrer));
      }
      return faro;
    })
    .catch(() => null);
}

export function setFaroUser(userId: string | undefined, email?: string): void {
  void loaded.then((faro) => {
    if (!faro) {
      return;
    }
    if (userId || email) {
      faro.api.setUser({ ...(userId && { id: userId }), ...(email && { email }) });
    } else {
      faro.api.resetUser();
    }
  });
}
