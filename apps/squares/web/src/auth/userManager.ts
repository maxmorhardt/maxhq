import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { oidcRedirectUri } from '../utils/environment';
import { getOidcClient, OIDC_AUTHORITY } from './oidc';

let userManager: UserManager | undefined;

// one manager for the whole app, shared by the auth provider, the api, and the event stream
export function getUserManager(): UserManager {
  if (!userManager) {
    const client = getOidcClient();
    userManager = new UserManager({
      authority: OIDC_AUTHORITY,
      client_id: client.clientId,
      redirect_uri: oidcRedirectUri(),
      scope: client.scope,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    });
  }

  return userManager;
}
