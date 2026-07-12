import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthContextProps } from 'react-oidc-context';
import { signInWithProvider } from './oidcHelpers';

describe('signInWithProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
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

  it('redirects with the github connector', () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    const auth = { signinRedirect } as unknown as AuthContextProps;

    signInWithProvider(auth, 'github');

    expect(signinRedirect).toHaveBeenCalledWith({
      extraQueryParams: { connector_id: 'github' },
    });
  });
});
