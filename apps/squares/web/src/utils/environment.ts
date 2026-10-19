// one build serves every environment: squares<suffix>.<domain> talks to api<suffix> and login<suffix>,
// where prod has no suffix and dev is squares-dev.maxhq.io
export const PRODUCTION_DOMAIN = 'maxhq.io';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

interface Environment {
  domain: string;
  suffix: string;
}

const currentHostname = (): string =>
  typeof window === 'undefined' ? `squares.${PRODUCTION_DOMAIN}` : window.location.hostname;

export const parseEnvironment = (hostname: string = currentHostname()): Environment | null => {
  if (LOCAL_HOSTS.has(hostname)) {
    return null;
  }

  const [label, ...rest] = hostname.split('.');
  const dash = label.indexOf('-');
  return { domain: rest.join('.'), suffix: dash === -1 ? '' : label.slice(dash) };
};

const serviceUrl = (service: string, env: Environment): string =>
  `https://${service}${env.suffix}.${env.domain}`;

export const isProduction = (hostname?: string): boolean => {
  const env = parseEnvironment(hostname);
  return env?.domain === PRODUCTION_DOMAIN && env.suffix === '';
};

export const apiBaseUrl = (hostname?: string): string => {
  const env = parseEnvironment(hostname);
  return env ? `${serviceUrl('api', env)}/squares` : 'http://localhost:8080/squares';
};

// local development signs in against production
export const oidcAuthority = (hostname?: string): string =>
  serviceUrl('login', parseEnvironment(hostname) ?? { domain: PRODUCTION_DOMAIN, suffix: '' });

export const oidcRedirectUri = (): string => {
  const origin =
    typeof window === 'undefined' ? `https://squares.${PRODUCTION_DOMAIN}` : window.location.origin;
  return `${origin}/auth/callback`;
};
