import type { Faro } from '@grafana/faro-web-sdk';
import { appDomain, isProduction } from './environment';

const FARO_URL =
  'https://faro-collector-prod-us-east-2.grafana.net/collect/4c8da302ecf785b47cd7f5dbc361767c';

export interface FaroUser {
  sub: string;
  email?: string;
  name?: string;
}

const INVITE_TOKEN = /\/(join|invites)\/[^/?#"\s]+/g;

let loaded: Promise<Faro | null> = Promise.resolve(null);

// page urls, resource timings and errors can all carry an invite link
export function redactInviteTokens<T>(item: T): T {
  return JSON.parse(JSON.stringify(item).replace(INVITE_TOKEN, '/$1/:token')) as T;
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
        beforeSend: redactInviteTokens,
      })
    )
    .catch(() => null);
}

export function setFaroUser(user: FaroUser | undefined): void {
  void loaded.then((faro) => {
    if (!faro) {
      return;
    }
    if (user) {
      faro.api.setUser({ id: user.sub, email: user.email, username: user.name });
    } else {
      faro.api.resetUser();
    }
  });
}
