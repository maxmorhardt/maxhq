import { Box, GlobalStyles } from '@mui/material';
import { Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { useAxiosAuth } from './hooks/useAxiosAuth';
import { gradients } from './types/gradients';

export default function App() {
  useAxiosAuth();

  return (
    <>
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
          minHeight: '100vh',
        }}
      >
        <Header />
        <Outlet />
        <ToastProvider />
      </Box>
    </>
  );
}
