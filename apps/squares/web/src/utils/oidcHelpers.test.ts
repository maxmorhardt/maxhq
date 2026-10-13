import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuthContextProps } from 'react-oidc-context';
import { getOidcClient, OIDC_AUTHORITY, signInWithProvider } from './oidcHelpers';

describe('signInWithProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the current path and redirects with the google connector', () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    const auth = { signinRedirect } as unknown as AuthContextProps;

    signInWithProvider(auth, 'google');

    expect(sessionStorage.getItem('auth_redirect_path')).toBe(window.location.pathname);
    expect(signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'google' },
    });
  });

  it('preserves query params and hash from the current location for deep links', () => {
    vi.stubGlobal('location', {
      ...window.location,
      pathname: '/contests/c-1',
      search: '?tab=scores',
      hash: '#square-12',
    });
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    const auth = { signinRedirect } as unknown as AuthContextProps;

    signInWithProvider(auth, 'google');

    expect(sessionStorage.getItem('auth_redirect_path')).toBe('/contests/c-1?tab=scores#square-12');
  });

  it('redirects with the github connector', () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    const auth = { signinRedirect } as unknown as AuthContextProps;

    signInWithProvider(auth, 'github');

    expect(signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });
});

describe('getOidcClient', () => {
  const stubPointer = (coarse: boolean) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: coarse && query === '(pointer: coarse)',
    }));
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the web client on a fine pointer device', () => {
    stubPointer(false);

    expect(getOidcClient()).toEqual({
      clientId: 'squares',
      scope: 'openid profile email offline_access',
    });
  });

  it('uses the mobile client with the web audience on a touch device', () => {
    stubPointer(true);

    expect(getOidcClient()).toEqual({
      clientId: 'squares-mobile',
      scope: 'openid profile email offline_access audience:server:client_id:squares',
    });
  });

  it('ignores a leftover web session on a touch device', () => {
    stubPointer(true);
    localStorage.setItem(`oidc.user:${OIDC_AUTHORITY}:squares`, '{}');

    expect(getOidcClient().clientId).toBe('squares-mobile');
  });

  it('uses the web client when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(getOidcClient().clientId).toBe('squares');
  });
});
