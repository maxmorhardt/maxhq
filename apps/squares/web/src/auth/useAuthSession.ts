import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { baseApi } from '../api/baseApi';
import { useAppDispatch } from '../app/hooks';
import { useToast } from '../features/toast/useToast';
import { refreshSession } from './token';

// app-wide session upkeep; mounted once in the app layout
export function useAuthSession() {
  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const triedSilentSignin = useRef(false);
  const lastNavigator = useRef<string | undefined>(undefined);
  const wasAuthenticated = useRef(auth.isAuthenticated);

  // remember which navigation was running, since it clears before an error surfaces
  useEffect(() => {
    if (auth.activeNavigator) {
      lastNavigator.current = auth.activeNavigator;
    }
  }, [auth.activeNavigator]);

  // only a failed sign-in redirect is worth telling the user about
  useEffect(() => {
    if (!auth.isLoading && auth.error && lastNavigator.current === 'signinRedirect') {
      showToast('Authentication failed. Please try again', 'error');
    }
  }, [auth.error, auth.isLoading, showToast]);

  // a stored session that expired while the app was closed is renewed once on load
  useEffect(() => {
    if (
      auth.isAuthenticated ||
      auth.isLoading ||
      !auth.user?.refresh_token ||
      triedSilentSignin.current
    ) {
      return;
    }

    triedSilentSignin.current = true;
    void refreshSession();
  }, [auth.isAuthenticated, auth.isLoading, auth.user]);

  // cached data belongs to whoever was signed in, so drop it on sign-out
  useEffect(() => {
    if (wasAuthenticated.current && !auth.isAuthenticated && !auth.isLoading) {
      dispatch(baseApi.util.resetApiState());
    }
    wasAuthenticated.current = auth.isAuthenticated;
  }, [auth.isAuthenticated, auth.isLoading, dispatch]);

  // timers stall in background tabs, so renew a session that went stale while the tab was away
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && auth.user?.expired && auth.user.refresh_token) {
        void refreshSession();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [auth.user]);
}
