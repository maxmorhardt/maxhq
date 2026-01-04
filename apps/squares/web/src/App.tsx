import { Box, GlobalStyles } from '@mui/material';
import { useEffect } from 'react';
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

  // monitor auth errors and show toast
  useEffect(() => {
    if (!auth.isLoading && auth.error) {
      showToast('Authentication failed. Please try again', 'error');
    }
  }, [auth.error, auth.isLoading, showToast]);

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
