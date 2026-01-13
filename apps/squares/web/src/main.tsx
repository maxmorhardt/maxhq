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
import CallbackPage from './pages/auth/CallbackPage';
import ContactPage from './pages/contact/ContactPage';
import ContestPage from './pages/contests/contest/ContestPage';
import ContestsPage from './pages/contests/ContestsPage';
import CreateContestPage from './pages/contests/create/CreateContestPage';
import NotFoundPage from './pages/error/NotFoundPage';
import LandingPage from './pages/landing/LandingPage';
import LearnMorePage from './pages/learn/LearnMorePage';
import PrivacyPolicyPage from './pages/privacy/PrivacyPolicyPage';
import TermsOfServicePage from './pages/terms/TermsOfServicePage';

const oidcConfig: AuthProviderProps = {
  authority: 'https://login.maxstash.io/application/o/squares/',
  client_id: 'n3k9hWCDo584GSotQragu1mZ8QQyhfTv1nHHTQuZ',
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
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'auth/callback', element: <CallbackPage /> },
      { path: 'contests', element: <ContestsPage /> },
      { path: 'contests/create', element: <CreateContestPage /> },
      { path: 'contests/:id', element: <ContestPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'learn-more', element: <LearnMorePage /> },
      { path: 'privacy-policy', element: <PrivacyPolicyPage /> },
      { path: 'terms-of-service', element: <TermsOfServicePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AuthProvider {...oidcConfig}>
          <CssBaseline />
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>
);
