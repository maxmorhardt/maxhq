import type { AuthContextProps } from 'react-oidc-context';

export type OidcProvider = 'google' | 'github';

// deep-link straight to a provider so dex skips its own picker page
export const signInWithProvider = (
  auth: AuthContextProps,
  provider: OidcProvider,
  redirectPath?: string
): void => {
  const { pathname, search, hash } = window.location;
  sessionStorage.setItem('auth_redirect_path', redirectPath ?? `${pathname}${search}${hash}`);
  void auth.signinRedirect({ extraQueryParams: { connector_id: provider } });
};
