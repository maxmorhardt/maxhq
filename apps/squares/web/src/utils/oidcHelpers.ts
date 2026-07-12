import type { AuthContextProps } from 'react-oidc-context';

export type OidcProvider = 'google' | 'github';

// deep-link straight to a provider so dex skips its own picker page
export const signInWithProvider = (
  auth: AuthContextProps,
  provider: OidcProvider,
  redirectPath?: string
): void => {
  sessionStorage.setItem('auth_redirect_path', redirectPath ?? window.location.pathname);
  void auth.signinRedirect({ extraQueryParams: { connector_id: provider } });
};
