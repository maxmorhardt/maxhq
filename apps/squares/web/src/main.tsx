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
import ContactPage from './pages/contact/ContactPage';
import ContestPage from './pages/contest/ContestPage';
import CreateContestPage from './pages/contest/create/CreateContestPage';
import ContestsPage from './pages/contests/ContestsPage';
import LandingPage from './pages/landing/LandingPage';
import LearnMorePage from './pages/learn/LearnMorePage';

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

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'contests', element: <ContestsPage /> },
      { path: 'contests/create', element: <CreateContestPage /> },
      { path: 'contests/:id', element: <ContestPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'learn-more', element: <LearnMorePage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider {...oidcConfig}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  </StrictMode>
);
