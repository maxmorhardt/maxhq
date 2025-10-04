import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import App from './App';
import './index.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const oidcConfig: AuthProviderProps = {
	authority: 'https://auth.maxstash.io/realms/maxstash',
	client_id: 'squares',
	redirect_uri: import.meta.env.PROD ? 'https://squares.maxstash.io' : 'http://localhost:3000',
	onSigninCallback: () => {
		window.history.replaceState({}, document.title, window.location.pathname);
	},
};

const router = createBrowserRouter(
	createRoutesFromElements(
		<Route path='/' element={<App />}>

		</Route>
	)
);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<AuthProvider {...oidcConfig}>
			<ThemeProvider theme={darkTheme}>
				<CssBaseline />
					<RouterProvider router={router} />
			</ThemeProvider>
		</AuthProvider>
	</StrictMode>,
);