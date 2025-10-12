import { Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import { ToastProvider } from './components/toast/ToastProvider';
import { useAxiosAuth } from './hooks/useAxiosAuth';

export default function App() {
  useAxiosAuth();

  return (
    <>
      <Header />
      <Outlet />
      <ToastProvider />
    </>
  );
}
