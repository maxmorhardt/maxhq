import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { useAuthSession } from '../auth/useAuthSession';
import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';
import ScrollToTop from '../components/layout/ScrollToTop';
import ToastHost from '../features/toast/ToastHost';
import { gradients } from '../types/gradients';
import './global.css';

export default function AppLayout() {
  useAuthSession();

  return (
    <>
      <ScrollToTop />
      <ToastHost />

      <Box
        sx={{
          background: gradients.background,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />

        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>

        <Footer />
      </Box>
    </>
  );
}
