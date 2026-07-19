import { Box, GlobalStyles } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';
import './App.css';
import ScrollToTop from './components/common/ScrollToTop';
import Footer from './components/footer/Footer';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { loadUserProfile, loadUserStats } from './features/user/userThunks';
import { useAppDispatch } from './hooks/reduxHooks';
import { useAxiosAuth } from './hooks/useAxiosAuth';
import { useToast } from './hooks/useToast';
import { gradients } from './types/gradients';

export default function App() {
  const axiosReady = useAxiosAuth();

  const auth = useAuth();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  // get profile once after auth
  const hasLoadedProfile = useRef(false);
  useEffect(() => {
    if (!auth.isAuthenticated || !axiosReady || hasLoadedProfile.current) {
      return;
    }

    hasLoadedProfile.current = true;
    dispatch(loadUserProfile());
    dispatch(loadUserStats());
  }, [auth.isAuthenticated, axiosReady, dispatch]);

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
    auth.signinSilent().catch(() => {});
  }, [auth]);

  return (
    <>
      <ScrollToTop />
      <ToastProvider />
      <GlobalStyles
        styles={{
          // remove default page margin and padding
          body: {
            margin: 0,
            padding: 0,
          },
          // prevent mui default of all caps in buttons
          button: {
            textTransform: 'none !important',
          },
        }}
      />

      <Box
        sx={{
          // set full app container styles
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
