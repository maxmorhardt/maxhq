const FARO_URL =
  'https://faro-collector-prod-us-east-2.grafana.net/collect/ca837d3245a2869658fa79b1f4e444dc';

const PRODUCTION_HOST = 'maxhq.io';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

// loaded lazily so the SDK stays out of the main bundle
export function initFaro(hostname?: string, url: string = FARO_URL): Promise<void> {
  if (typeof window === 'undefined' || !url) {
    return Promise.resolve();
  }

  const host = hostname ?? window.location.hostname;
  if (LOCAL_HOSTS.has(host)) {
    return Promise.resolve();
  }

  return import('@grafana/faro-web-sdk')
    .then(({ getWebInstrumentations, initializeFaro }) => {
      initializeFaro({
        url,
        app: {
          name: 'maxhq',
          environment: host === PRODUCTION_HOST ? 'production' : 'development',
        },
        instrumentations: getWebInstrumentations(),
      });
    })
    .catch(() => undefined);
}
