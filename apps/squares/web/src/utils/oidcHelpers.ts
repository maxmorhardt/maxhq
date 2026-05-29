import type { AuthContextProps } from 'react-oidc-context';

interface OidcState {
  id: string;
  created: number;
  request_type: string;
  code_verifier: string;
  redirect_uri: string;
  scope: string;
  authority: string;
  client_id: string;
  extraTokenParams: Record<string, unknown>;
}

// true only when a stored session has a refresh token but an expired/missing access token
export const isSilentRefreshNeeded = (): boolean => {
  try {
    const key = Object.keys(localStorage).find((k) => k.startsWith('oidc.user:'));
    if (!key) {
      return false;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      return false;
    }

    const stored = JSON.parse(raw) as { expires_at?: number; refresh_token?: string };
    if (!stored.refresh_token) {
      return false;
    }

    // expires_at is in unix seconds; missing or in the past means a refresh is needed
    const nowSeconds = Date.now() / 1000;
    return stored.expires_at === undefined || stored.expires_at <= nowSeconds;
  } catch {
    return false;
  }
};

// generate cryptographically random hex string
const generateRandomString = (length: number): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// create PKCE code challenge from verifier using SHA-256
const createCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// manually create and store OIDC state for registration flow
export const createOidcStateForRegistration = async (
  authSettings: AuthContextProps['settings']
): Promise<{ state: string; codeChallenge: string }> => {
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(32);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const oidcState: OidcState = {
    id: state,
    created: Math.floor(Date.now() / 1000),
    request_type: 'si:r',
    code_verifier: codeVerifier,
    redirect_uri: authSettings.redirect_uri || '',
    scope: authSettings.scope || 'openid profile email offline_access',
    authority: authSettings.authority || '',
    client_id: authSettings.client_id || '',
    extraTokenParams: {},
  };

  localStorage.setItem(`oidc.${state}`, JSON.stringify(oidcState));

  return { state, codeChallenge };
};
