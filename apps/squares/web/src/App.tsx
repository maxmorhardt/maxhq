import { Box, GlobalStyles } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';
import './App.css';
import AuthLoadingAnimation from './components/common/AuthLoadingAnimation';
import ScrollToTop from './components/common/ScrollToTop';
import Footer from './components/footer/Footer';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { useAxiosAuth } from './hooks/useAxiosAuth';
import { useToast } from './hooks/useToast';
import { gradients } from './types/gradients';
import { isSilentRefreshNeeded } from './utils/oidcHelpers';

const SPLASH_EXIT_MS = 400;

// splash only on initial load when a refresh is pending; callback runs its own animation
const initialSplashActive =
  window.location.pathname !== '/auth/callback' && isSilentRefreshNeeded();

export default function App() {
  useAxiosAuth();

  const auth = useAuth();
  const { showToast } = useToast();

  const hasAttemptedSilentSignin = useRef(false);
  const lastActiveNavigator = useRef<string | undefined>(undefined);
  const isInitialLoad = useRef(initialSplashActive);

  const [splashActive, setSplashActive] = useState(initialSplashActive);
  const [splashExiting, setSplashExiting] = useState(false);

  // get active navigator before it clears
  useEffect(() => {
    if (auth.activeNavigator) {
      lastActiveNavigator.current = auth.activeNavigator;
    }
  }, [auth.activeNavigator]);

  // monitor auth errors and show toast
  useEffect(() => {
    if (auth.isLoading || !auth.error) {
      return;
    }

    // only show error for signinRedirect failures
    if (lastActiveNavigator.current !== 'signinRedirect') {
      return;
    }

    showToast('Authentication failed. Please try again', 'error');
  }, [auth.error, auth.isLoading, showToast]);

  // play the splash exit animation, then unmount it (only ever runs once)
  const dismissSplash = useCallback(() => {
    if (!isInitialLoad.current) {
      return;
    }

    isInitialLoad.current = false;
    setSplashExiting(true);
    setTimeout(() => setSplashActive(false), SPLASH_EXIT_MS);
  }, []);

  // silent signin on load if we arent authenticated but have refresh token
  useEffect(() => {
    if (
      auth.isAuthenticated ||
      auth.isLoading ||
      !auth.user ||
      !auth.user.refresh_token ||
      hasAttemptedSilentSignin.current
    ) {
      return;
    }

    hasAttemptedSilentSignin.current = true;
    auth
      .signinSilent()
      .catch(() => {})
      .finally(() => {
        dismissSplash();
      });
  }, [auth, dismissSplash]);

  // dismiss once authenticated (covers a refresh completed by any path)
  useEffect(() => {
    if (auth.isAuthenticated) {
      dismissSplash();
    }
  }, [auth.isAuthenticated, dismissSplash]);

  // safety net: never let the splash get stuck if auth never settles
  useEffect(() => {
    if (!initialSplashActive) {
      return;
    }

    const id = setTimeout(() => dismissSplash(), 8000);
    return () => clearTimeout(id);
  }, [dismissSplash]);

  return (
    <>
      <ScrollToTop />
      <ToastProvider />
      <GlobalStyles
        styles={{
          body: {
            margin: 0,
            padding: 0,
          },
          button: {
            textTransform: 'none !important',
          },
        }}
      />

      <Box
        sx={{
          background: gradients.background,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />

        <Box sx={{ flex: 1 }}>
          {splashActive ? <AuthLoadingAnimation exiting={splashExiting} /> : <Outlet />}
        </Box>

        <Footer />
      </Box>
    </>
  );
}
