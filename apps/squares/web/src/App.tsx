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

  // monitor auth errors and show toast
  useEffect(() => {
    if (!auth.isLoading && auth.error) {
      showToast('Authentication failed. Please try again', 'error');
    }
  }, [auth.error, auth.isLoading, showToast]);

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
      .then(() => {
        hasAttemptedSilentSignin.current = false;
      })
      .catch((error) => {
        console.error('Silent signin failed:', error);
        showToast('Session expired. Please log in again.', 'error');
      });
  }, [auth, showToast]);

  return (
    <>
      <ScrollToTop />
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
        <ToastProvider />
      </Box>
    </>
  );
}
