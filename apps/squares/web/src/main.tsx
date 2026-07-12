import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { WebStorageStateStore } from 'oidc-client-ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import './index.css';
import CallbackPage from './pages/auth/CallbackPage';
import ContactPage from './pages/contact/ContactPage';
import ContestPage from './pages/contests/contest/ContestPage';
import ContestsPage from './pages/contests/ContestsPage';
import CreateContestPage from './pages/contests/create/CreateContestPage';
import ErrorBoundary, { ErrorFallback } from './pages/error/ErrorBoundary';
import NotFoundPage from './pages/error/NotFoundPage';
import JoinPage from './pages/join/JoinPage';
import LandingPage from './pages/landing/LandingPage';
import LearnMorePage from './pages/learn/LearnMorePage';
import ProfilePage from './pages/profile/ProfilePage';

const oidcConfig: AuthProviderProps = {
  authority: 'https://login.maxstash.io',
  client_id: 'squares',
  redirect_uri: import.meta.env.PROD
    ? 'https://squares.maxstash.io/auth/callback'
    : 'http://localhost:3000/auth/callback',
  scope: 'openid profile email offline_access',
  userStore: new WebStorageStateStore({ store: window.localStorage }),
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
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'auth/callback', element: <CallbackPage /> },
      { path: 'contests', element: <ContestsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'contests/create', element: <CreateContestPage /> },
      { path: 'contests/:id', element: <ContestPage /> },
      { path: 'join/:token', element: <JoinPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'learn-more', element: <LearnMorePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <AuthProvider {...oidcConfig}>
            <CssBaseline />
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </HelmetProvider>
  </StrictMode>
);
