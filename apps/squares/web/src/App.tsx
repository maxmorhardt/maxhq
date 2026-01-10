import { Box, GlobalStyles } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';
import './App.css';
import ScrollToTop from './components/common/ScrollToTop';
import Footer from './components/footer/Footer';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { useAxiosAuth } from './hooks/useAxiosAuth';
import { useToast } from './hooks/useToast';
import { gradients } from './types/gradients';

export default function App() {
  useAxiosAuth();

  const auth = useAuth();
  const { showToast } = useToast();

  const hasAttemptedSilentSignin = useRef(false);
  const lastActiveNavigator = useRef<string | undefined>(undefined);

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
    auth.signinSilent();
  }, [auth, showToast]);

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
          <Outlet />
        </Box>

        <Footer />
      </Box>
    </>
  );
}
