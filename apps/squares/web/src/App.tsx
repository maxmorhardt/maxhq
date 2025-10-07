import { Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import { useAxiosAuth } from './axios/api';

export default function App() {
  useAxiosAuth();

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
