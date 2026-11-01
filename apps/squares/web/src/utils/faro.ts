import type { Faro } from '@grafana/faro-web-sdk';
import { appDomain, isProduction } from './environment';

const FARO_URL =
  'https://faro-collector-prod-us-east-2.grafana.net/collect/4c8da302ecf785b47cd7f5dbc361767c';

const INVITE_TOKEN = /\/(join|invites)\/[\w-]+/g;
const OIDC_PARAM = /([?&](?:code|state|session_state)=)[^&#"\s\\]+/g;

let loaded: Promise<Faro | null> = Promise.resolve(null);

// page urls, resource timings and errors can carry an invite link or the sign-in callback's code
export function redactSecrets<T>(item: T): T {
  return JSON.parse(
    JSON.stringify(item).replace(INVITE_TOKEN, '/$1/:token').replace(OIDC_PARAM, '$1:redacted')
  ) as T;
}

// loaded lazily so the SDK stays out of the main bundle
export function initFaro(hostname?: string, url: string = FARO_URL): void {
  if (typeof window === 'undefined' || !url || !appDomain(hostname)) {
    return;
  }

  loaded = import('@grafana/faro-web-sdk')
    .then(({ getWebInstrumentations, initializeFaro }) =>
      initializeFaro({
        url,
        app: {
          name: 'squares',
          environment: isProduction(hostname) ? 'production' : 'development',
        },
        instrumentations: getWebInstrumentations(),
        beforeSend: redactSecrets,
      })
    )
    .catch(() => null);
}

export function setFaroUser(userId: string | undefined): void {
  void loaded.then((faro) => {
    if (!faro) {
      return;
    }
    if (userId) {
      faro.api.setUser({ id: userId });
    } else {
      faro.api.resetUser();
    }
  });
}
