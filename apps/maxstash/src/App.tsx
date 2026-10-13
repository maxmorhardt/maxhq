import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import ScrollToTop from './components/common/ScrollToTop';
import AppFooter from './components/footer/AppFooter';
import AppHeader from './components/header/AppHeader';

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <AppHeader />

        <Box component="main" sx={{ flex: 1 }}>
          <Outlet />
        </Box>

        <AppFooter />
      </Box>
    </>
  );
}
