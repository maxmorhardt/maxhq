// one build serves every environment: squares.<domain> talks to api.<domain> and login.<domain>,
// where prod is maxhq.io and dev is dev.maxhq.io
export const PRODUCTION_DOMAIN = 'maxhq.io';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const currentHostname = (): string =>
  typeof window === 'undefined' ? `squares.${PRODUCTION_DOMAIN}` : window.location.hostname;

export const appDomain = (hostname: string = currentHostname()): string | null =>
  LOCAL_HOSTS.has(hostname) ? null : hostname.split('.').slice(1).join('.');

export const isProduction = (hostname?: string): boolean =>
  appDomain(hostname) === PRODUCTION_DOMAIN;

export const apiBaseUrl = (hostname?: string): string => {
  const domain = appDomain(hostname);
  return domain ? `https://api.${domain}/squares` : 'http://localhost:8080/squares';
};

// local development signs in against production
export const oidcAuthority = (hostname?: string): string =>
  `https://login.${appDomain(hostname) ?? PRODUCTION_DOMAIN}`;

export const oidcRedirectUri = (): string => {
  const origin =
    typeof window === 'undefined' ? `https://squares.${PRODUCTION_DOMAIN}` : window.location.origin;
  return `${origin}/auth/callback`;
};
