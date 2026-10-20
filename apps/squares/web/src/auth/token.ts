import type { User } from 'oidc-client-ts';
import { getUserManager } from './userManager';

// refresh a little early so a token never expires mid-request
const REFRESH_MARGIN_SECONDS = 60;

let refreshing: Promise<User | null> | null = null;

// every caller that needs a fresh token at the same time shares one refresh
export function refreshSession(): Promise<User | null> {
  refreshing ??= getUserManager()
    .signinSilent()
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

function isExpiring(user: User): boolean {
  return user.expires_in === undefined || user.expires_in <= REFRESH_MARGIN_SECONDS;
}

// timers stall in background tabs, so the stored token can be stale; check it on every use
export async function getIdToken({ forceRefresh = false } = {}): Promise<string | null> {
  const user = await getUserManager().getUser();
  if (!user) {
    return null;
  }

  if (!forceRefresh && !isExpiring(user)) {
    return user.id_token ?? null;
  }

  const refreshed = await refreshSession();
  if (refreshed?.id_token) {
    return refreshed.id_token;
  }

  return !forceRefresh && !user.expired ? (user.id_token ?? null) : null;
}

export async function signOutLocally(): Promise<void> {
  await getUserManager().removeUser();
}
