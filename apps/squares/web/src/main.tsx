import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { WebStorageStateStore } from 'oidc-client-ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import './index.css';
import GridPage from './pages/grid/GridPage';
import GridsPage from './pages/grids/GridsPage';
import LandingPage from './pages/landing/LandingPage';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const oidcConfig: AuthProviderProps = {
  authority: 'https://auth.maxstash.io/realms/maxstash',
  client_id: 'squares',
  redirect_uri: import.meta.env.PROD ? 'https://squares.maxstash.io' : 'http://localhost:3000',
	automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'grids', element: <GridsPage /> },
      { path: 'grids/:id', element: <GridPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider {...oidcConfig}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  </StrictMode>
);
