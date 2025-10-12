import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { useAxiosAuth } from './hooks/useAxiosAuth';

export default function App() {
  useAxiosAuth();

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
        minHeight: '100vh',
      }}
    >
      <Header />
      <Outlet />
      <ToastProvider />
    </Box>
  );
}
