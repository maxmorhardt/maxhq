import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AuthContextProps } from 'react-oidc-context';
import { signInWithProvider } from './oidcHelpers';

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
      pathname: '/contests/owner/alice/name/pool',
      search: '?tab=scores',
      hash: '#square-12',
    });
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    const auth = { signinRedirect } as unknown as AuthContextProps;

    signInWithProvider(auth, 'google');

    expect(sessionStorage.getItem('auth_redirect_path')).toBe(
      '/contests/owner/alice/name/pool?tab=scores#square-12'
    );
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
