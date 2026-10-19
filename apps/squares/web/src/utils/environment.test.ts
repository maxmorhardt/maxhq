import { describe, expect, it } from 'vitest';
import {
  apiBaseUrl,
  isProduction,
  oidcAuthority,
  oidcRedirectUri,
  parseEnvironment,
} from './environment';

describe('environment', () => {
  it('reads the domain and environment suffix from the squares host', () => {
    expect(parseEnvironment('squares.maxhq.io')).toEqual({ domain: 'maxhq.io', suffix: '' });
    expect(parseEnvironment('squares-dev.maxhq.io')).toEqual({
      domain: 'maxhq.io',
      suffix: '-dev',
    });
    expect(parseEnvironment('localhost')).toBeNull();
  });

  it('points the api at the same environment', () => {
    expect(apiBaseUrl('squares.maxhq.io')).toBe('https://api.maxhq.io/squares');
    expect(apiBaseUrl('squares-dev.maxhq.io')).toBe('https://api-dev.maxhq.io/squares');
    expect(apiBaseUrl('localhost')).toBe('http://localhost:8080/squares');
  });

  it('signs in against the same environment, and production when local', () => {
    expect(oidcAuthority('squares.maxhq.io')).toBe('https://login.maxhq.io');
    expect(oidcAuthority('squares-dev.maxhq.io')).toBe('https://login-dev.maxhq.io');
    expect(oidcAuthority('localhost')).toBe('https://login.maxhq.io');
  });

  it('only treats the unsuffixed production domain as production', () => {
    expect(isProduction('squares.maxhq.io')).toBe(true);
    expect(isProduction('squares-dev.maxhq.io')).toBe(false);
    expect(isProduction('localhost')).toBe(false);
  });

  it('redirects back to the current origin', () => {
    expect(oidcRedirectUri()).toBe(`${window.location.origin}/auth/callback`);
  });
});
