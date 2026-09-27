import type { AuthContextProps } from 'react-oidc-context';

export type OIDCProvider = 'google' | 'github';

export const OIDC_AUTHORITY = 'https://login.maxstash.io';

const WEB_CLIENT_ID = 'squares';
const MOBILE_CLIENT_ID = 'squares-mobile';
const BASE_SCOPE = 'openid profile email offline_access';

// web vs phone clients
export const getOidcClient = (): { clientId: string; scope: string } => {
  const clientId = resolveClientId();

  // the mobile client asks dex to issue its tokens for the web client's audience so the api accepts them
  const scope =
    clientId === MOBILE_CLIENT_ID
      ? `${BASE_SCOPE} audience:server:client_id:${WEB_CLIENT_ID}`
      : BASE_SCOPE;

  return { clientId, scope };
};

const resolveClientId = (): string => {
  if (typeof window === 'undefined') {
    return WEB_CLIENT_ID;
  }

  // stay on whichever client issued an existing session so a changed detection result never signs the user out
  try {
    for (const clientId of [WEB_CLIENT_ID, MOBILE_CLIENT_ID]) {
      if (window.localStorage.getItem(`oidc.user:${OIDC_AUTHORITY}:${clientId}`)) {
        return clientId;
      }
    }
  } catch {
    // storage can be blocked, fall through to detection
  }

  // a coarse primary pointer means a touch-first device
  return window.matchMedia?.('(pointer: coarse)').matches ? MOBILE_CLIENT_ID : WEB_CLIENT_ID;
};

// deep-link straight to a provider so dex skips its own picker page
export const signInWithProvider = (
  auth: AuthContextProps,
  provider: OIDCProvider,
  redirectPath?: string
): void => {
  const { pathname, search, hash } = window.location;
  sessionStorage.setItem('auth_redirect_path', redirectPath ?? `${pathname}${search}${hash}`);
  void auth.signinRedirect({ extraQueryParams: { connector_id: provider } });
};
