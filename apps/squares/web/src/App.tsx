import { Outlet } from 'react-router-dom';
import './App.css';
import Header from './components/header/Header';
import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { setupAxiosInterceptors } from './config/axios';

export default function App() {
	const auth = useAuth();

	useEffect(() => {
    setupAxiosInterceptors(auth.user);
  }, [auth.user]);

	return (
		<>
			<Header />
			<Outlet />
		</>
	);
}
